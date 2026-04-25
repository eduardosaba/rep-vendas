import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Clona produtos de um `sourceUserId` para `targetUserId` filtrando por `brandName`.
 * Usa upsert baseado em (user_id, reference_code) para tornar a operação idempotente.
 * Também replica linhas de `product_images` associadas (sem mover arquivos do storage).
 */
export async function clonarCatalogo(
  svc: SupabaseClient,
  sourceUserId: string,
  targetUserId: string,
  brandName: string
) {
  // Detecta se o alvo pertence a uma empresa (tenant corporativo)
  const { data: targetProfile } = await svc
    .from('profiles')
    .select('company_id')
    .eq('id', targetUserId)
    .maybeSingle();
  const targetCompanyId = (targetProfile as any)?.company_id || null;

  // Detecta company do source caso a brand esteja associada a uma company
  const { data: sourceProfile } = await svc
    .from('profiles')
    .select('company_id')
    .eq('id', sourceUserId)
    .maybeSingle();
  const sourceCompanyId = (sourceProfile as any)?.company_id || null;

  // 1) Busca os produtos originais
  const { data: originalProducts, error: fetchError } = await svc
    .from('products')
    .select('*')
    .eq('user_id', sourceUserId)
    .eq('brand', brandName);

  if (fetchError) throw fetchError;
  if (!originalProducts || originalProducts.length === 0)
    return { success: true, count: 0 };

  // 2) (Opcional) Upsert da brand no target: traz meta da marca (logo/banner/descricao)
  // para que o target tenha a mesma apresentação. Não move arquivos do storage,
  // apenas copia as URLs/metadados.
  try {
    // Primeiro tente encontrar a brand do source como registro do usuário
    let srcBrand: any = null;
    const { data: brandUserData } = await svc
      .from('brands')
      .select('name,logo_url,banner_url,description,banner_meta')
      .eq('name', brandName)
      .eq('user_id', sourceUserId)
      .maybeSingle();

    if (brandUserData) {
      srcBrand = brandUserData;
    } else if (sourceCompanyId) {
      // fallback: procurar brand vinculada à company do source
      const { data: brandCompanyData } = await svc
        .from('brands')
        .select('name,logo_url,banner_url,description,banner_meta')
        .eq('name', brandName)
        .eq('company_id', sourceCompanyId)
        .maybeSingle();
      if (brandCompanyData) srcBrand = brandCompanyData;
    }

    if (srcBrand) {
      const brandPayload: any = {
        name: srcBrand.name,
        logo_url: srcBrand.logo_url || null,
        banner_url: srcBrand.banner_url || null,
        description: srcBrand.description || null,
        banner_meta: srcBrand.banner_meta || null,
        user_id: targetUserId,
        company_id: targetCompanyId || null,
      };

      // Use onConflict apropriado conforme target ser company ou user
      const onConflict = targetCompanyId ? 'company_id,name' : 'user_id,name';
      await svc.from('brands').upsert(brandPayload, { onConflict });
    }
  } catch (bErr) {
    // Não falhar o fluxo de clone se a brand não puder ser copiada
    const errMsg = (bErr && typeof bErr === 'object' && 'message' in bErr) ? (bErr as any).message : String(bErr);
    console.warn('falha ao copiar brand para target:', errMsg);
  }

  // 3) Prepara payload removendo ids e timestamps para que o DB gere novos ids
  const productsToClone = originalProducts.map((product: any) => {
    const { id, created_at, updated_at, ...productData } = product;
    // Garantir que reference_id exista no clone (fallback para reference_code)
    productData.reference_id = productData.reference_id || productData.reference_code || null;
    // Ensure newer product fields are explicitly copied so older clone flows that
    // rely on explicit mapping don't miss recently added columns.
    productData.material = typeof product.material !== 'undefined' ? product.material : (productData.material ?? null);
    productData.polarizado = typeof product.polarizado !== 'undefined' ? product.polarizado : (productData.polarizado ?? false);
    productData.fotocromatico = typeof product.fotocromatico !== 'undefined' ? product.fotocromatico : (productData.fotocromatico ?? false);

    return {
      ...productData,
      // mantemos o campo brand como veio do source
      brand: productData.brand,
      user_id: targetUserId,
      company_id: targetCompanyId || null,
    };
  });

  if (!targetCompanyId) {
    // 3) Fluxo individual: upsert por (user_id, reference_code)
    const { error: upsertError } = await svc
      .from('products')
      .upsert(productsToClone, { onConflict: 'user_id,reference_code' });

    if (upsertError) throw upsertError;
  } else {
    // 3) Fluxo corporativo: atualiza por company_id+reference_code; insere os ausentes
    const referenceCodesForCompany = productsToClone
      .map((p: any) => p.reference_code)
      .filter(Boolean);

    const { data: existingCompanyProducts } = await svc
      .from('products')
      .select('id,reference_code')
      .eq('company_id', targetCompanyId)
      .in('reference_code', referenceCodesForCompany as any[]);

    const existingByRef: Record<string, string> = {};
    (existingCompanyProducts || []).forEach((p: any) => {
      if (p.reference_code && !existingByRef[p.reference_code]) {
        existingByRef[p.reference_code] = p.id;
      }
    });

    const toInsert: any[] = [];
    const toUpdate: Array<{ id: string; payload: any }> = [];

    for (const item of productsToClone) {
      const ref = item.reference_code;
      const existingId = ref ? existingByRef[ref] : null;
      if (existingId) {
        toUpdate.push({ id: existingId, payload: item });
      } else {
        toInsert.push(item);
      }
    }

    if (toInsert.length > 0) {
      const { error: insertError } = await svc.from('products').insert(toInsert);
      if (insertError) throw insertError;
    }

    for (const item of toUpdate) {
      const { error: updateError } = await svc
        .from('products')
        .update(item.payload)
        .eq('id', item.id);
      if (updateError) throw updateError;
    }
  }

  // 4) Re-resgata produtos no target para obter os IDs gerados/atualizados
  // 4) Re-resgata produtos no target para obter os IDs gerados/atualizados
  // Agora mapeamos por `reference_code` (chave usada no upsert) para garantir
  // correspondência 1:1 entre o produto original e o clonado no target.
  const referenceCodes = productsToClone
    .map((p: any) => p.reference_code)
    .filter(Boolean);
  let targetProducts: any[] | null = null;
  if (targetCompanyId) {
    const { data } = await svc
      .from('products')
      .select('id,reference_code')
      .eq('company_id', targetCompanyId)
      .in('reference_code', referenceCodes as any[]);
    targetProducts = data as any[];
  } else {
    const { data } = await svc
      .from('products')
      .select('id,reference_code')
      .eq('user_id', targetUserId)
      .in('reference_code', referenceCodes as any[]);
    targetProducts = data as any[];
  }

  const refCodeToTargetId: Record<string, string> = {};
  (targetProducts || []).forEach((p: any) => {
    if (p.reference_code) refCodeToTargetId[p.reference_code] = p.id;
  });

  // 5) Clonar product_images: busca as imagens dos produtos originais e insere para os novos IDs
  const originalIds = originalProducts.map((p: any) => p.id).filter(Boolean);
  if (originalIds.length > 0) {
    // Buscar todas as colunas de product_images para preservar metadados
    const { data: images } = await svc
      .from('product_images')
      .select('*')
      .in('product_id', originalIds);

    if (images && images.length > 0) {
      const imagesToInsert: any[] = [];
      images.forEach((img: any) => {
        // encontra reference_id do produto original
        const originalProduct = originalProducts.find(
          (p: any) => p.id === img.product_id
        );
        // Use reference_code (chave de upsert) para localizar o produto alvo
        const refCode = originalProduct?.reference_code || null;
        const targetId = refCode ? refCodeToTargetId[refCode] : null;
        if (targetId) {
          imagesToInsert.push({
            product_id: targetId,
            url: img.url,
            is_primary: img.is_primary,
            position: img.position,
            sync_status: img.sync_status || 'synced',
          });
        }
      });

      if (imagesToInsert.length > 0) {
        // Inserção simples; não sobrescreve imagens existentes
        await svc.from('product_images').insert(imagesToInsert);
      }
    }
  }

  return { success: true, count: productsToClone.length };
}
