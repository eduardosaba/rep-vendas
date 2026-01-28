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
  // 1) Busca os produtos originais
  const { data: originalProducts, error: fetchError } = await svc
    .from('products')
    .select('*')
    .eq('user_id', sourceUserId)
    .eq('brand', brandName);

  if (fetchError) throw fetchError;
  if (!originalProducts || originalProducts.length === 0)
    return { success: true, count: 0 };

  // 2) Prepara payload removendo ids e timestamps para que o DB gere novos ids
  const productsToClone = originalProducts.map((product: any) => {
    const { id, created_at, updated_at, ...productData } = product;
    return {
      ...productData,
      user_id: targetUserId,
    };
  });

  // 3) Upsert em lotes (supabase aceita upsert em arrays grandes, mas cuidado com tamanho)
  const { error: upsertError } = await svc
    .from('products')
    .upsert(productsToClone, { onConflict: 'user_id,reference_code' });

  if (upsertError) throw upsertError;

  // 4) Re-resgata produtos no target para obter os IDs gerados/atualizados
  const referenceCodes = productsToClone
    .map((p: any) => p.reference_code)
    .filter(Boolean);
  const { data: targetProducts } = await svc
    .from('products')
    .select('id,reference_code')
    .eq('user_id', targetUserId)
    .in('reference_code', referenceCodes);

  const refToTargetId: Record<string, string> = {};
  (targetProducts || []).forEach((p: any) => {
    if (p.reference_code) refToTargetId[p.reference_code] = p.id;
  });

  // 5) Clonar product_images: busca as imagens dos produtos originais e insere para os novos IDs
  const originalIds = originalProducts.map((p: any) => p.id).filter(Boolean);
  if (originalIds.length > 0) {
    const { data: images } = await svc
      .from('product_images')
      .select('id,product_id,url,is_primary,position,sync_status')
      .in('product_id', originalIds);

    if (images && images.length > 0) {
      const imagesToInsert: any[] = [];
      images.forEach((img: any) => {
        // encontra reference_code do produto original
        const originalProduct = originalProducts.find(
          (p: any) => p.id === img.product_id
        );
        const ref = originalProduct?.reference_code;
        const targetId = ref ? refToTargetId[ref] : null;
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
