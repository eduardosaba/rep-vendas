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
    // Garantir que reference_id exista no clone (fallback para reference_code)
    productData.reference_id = productData.reference_id || productData.reference_code || null;
    return {
      ...productData,
      user_id: targetUserId,
    };
  });

  // 3) Upsert em lotes — usar `reference_code` como chave para preservar variantes
  // Observação: usar `reference_id` aqui fazia agrupar/colapsar múltiplos SKUs
  // com o mesmo `reference_id`, o que perde campos por-variant (ex: `gender`).
  const { error: upsertError } = await svc
    .from('products')
    .upsert(productsToClone, { onConflict: 'user_id,reference_code' });

  if (upsertError) throw upsertError;

  // 4) Re-resgata produtos no target para obter os IDs gerados/atualizados
  // 4) Re-resgata produtos no target para obter os IDs gerados/atualizados
  // Agora mapeamos por `reference_code` (chave usada no upsert) para garantir
  // correspondência 1:1 entre o produto original e o clonado no target.
  const referenceCodes = productsToClone
    .map((p: any) => p.reference_code)
    .filter(Boolean);
  const { data: targetProducts } = await svc
    .from('products')
    .select('id,reference_code')
    .eq('user_id', targetUserId)
    .in('reference_code', referenceCodes);

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
