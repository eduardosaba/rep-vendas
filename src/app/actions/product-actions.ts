"use server";

import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import { createAuditLog } from '@/lib/audit-service';
import { revalidatePath } from 'next/cache';
import { prepareProductGallery } from '@/lib/utils/image-logic';

export async function duplicateProductAction(productId: string) {
  try {
    const supabase = await createClient();
    const activeUserId = await getActiveUserId();
    if (!activeUserId) return { success: false, error: 'Não autorizado' };

    const { data: original, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (fetchError || !original) return { success: false, error: 'Produto original não encontrado' };

    // Limpar campos únicos e timestamps
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, created_at, updated_at, slug, reference_code, reference_id, sku, model_code, ...rest } = original as any;

    const copyPayload = {
      ...rest,
      name: `${original.name} (Cópia)`,
      // ensure unique fields are cleared to avoid unique constraint conflicts
      reference_code: original.reference_code ? `${original.reference_code}-COPY` : null,
      reference_id: null,
      sku: null,
      model_code: null,
      slug: original.slug ? `${original.slug}-copy-${Math.random().toString(36).substring(7)}` : null,
      user_id: activeUserId,
      image_is_shared: true,
      sync_status: 'synced',
    };

    const { data: newProduct, error: insertError } = await supabase
      .from('products')
      .insert(copyPayload)
      .select()
      .single();

    if (insertError) return { success: false, error: insertError.message || String(insertError) };

    // Revalida lista de produtos e cache relacionado
    try {
      revalidatePath('/dashboard/products');
    } catch (e) {
      // noop
    }

    return { success: true, newId: (newProduct as any).id };
  } catch (e: any) {
    console.error('Erro ao duplicar produto:', e);
    return { success: false, error: e?.message || String(e) };
  }
}
export async function updateProductAction(productId: string, formData: any) {
  try {
    const supabase = await createClient();
    const activeUserId = await getActiveUserId();

    if (!activeUserId)
      return { success: false, status: 401, error: 'Não autorizado' };

    // Prevent unique constraint violation on (user_id, brand, reference_code) for another product
    const normalizedRefCode = typeof formData?.reference_code === 'string'
      ? formData.reference_code.trim()
      : formData?.reference_code;
    const normalizedBrand = typeof formData?.brand === 'string'
      ? formData.brand.trim()
      : formData?.brand;

    if (normalizedRefCode) {
      let query = supabase
        .from('products')
        .select('id')
        .eq('user_id', activeUserId)
        .eq('reference_code', normalizedRefCode)
        .neq('id', productId);

      if (normalizedBrand) {
        query = query.eq('brand', normalizedBrand);
      }

      const qc = await query.limit(1);

      if (qc.error) {
        return {
          success: false,
          status: 500,
          error: qc.error.message || String(qc.error),
        };
      }
      if (qc.data && qc.data.length > 0) {
        return {
          success: false,
          status: 409,
          error: 'Código de referência (reference_code) já existe para este usuário e marca.',
        };
      }
    }

    // RLS is expected to allow the authenticated owner to update their product,
    // including `is_destaque`. No service-role bypass needed when RLS is configured.

    const { data, error } = await supabase
      .from('products')
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)
      .eq('user_id', activeUserId);

    if (error) {
      return {
        success: false,
        status: 500,
        error: error.message || String(error),
      };
    }

    await createAuditLog(
      'PRODUCT_UPDATE',
      `Produto ${formData.name || 'sem nome'} atualizado via Dashboard.`,
      { product_id: productId, reference: formData.reference_code }
    );

    try {
      revalidatePath('/dashboard/products');
      revalidatePath(`/dashboard/products/${productId}`);
      // also revalidate public catalog page if the user has a public catalog
      try {
        const { data: pc } = await supabase
          .from('public_catalogs')
          .select('catalog_slug')
          .eq('user_id', activeUserId)
          .maybeSingle();
        if ((pc as any)?.catalog_slug) revalidatePath(`/catalogo/${(pc as any).catalog_slug}`);
      } catch (e) {
        // ignore failures
      }
    } catch (e) {
      // ignore revalidate errors in server action
    }

    return { success: true };
  } catch (e: any) {
    console.error('updateProductAction error', e);
    return { success: false, status: 500, error: e?.message || String(e) };
  }
}

export async function syncProductGallery(
  productId: string,
  images: Array<string | { url?: string }>
) {
  try {
    const supabase = await createClient();
    const activeUserId = await getActiveUserId();
    if (!activeUserId)
      return { success: false, status: 401, error: 'Não autorizado' };

    // Normalize images to array of URLs
    const urls = (images || [])
      .map((it: any) => (typeof it === 'string' ? it : it?.url || null))
      .filter(Boolean);

    // Prepare rows for product_images
    const galleryItems = prepareProductGallery(productId, urls as string[]);

    // Replace existing product_images for this product with the new set
    const del = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);
    if (del.error) {
      // continue even if delete fails, attempt insert
      console.warn(
        'syncProductGallery: failed to delete existing images',
        del.error
      );
    }

    if (galleryItems.length > 0) {
      const ins = await supabase.from('product_images').insert(galleryItems);
      if (ins.error) {
        return {
          success: false,
          status: 500,
          error: ins.error.message || String(ins.error),
        };
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error('syncProductGallery error', e);
    return { success: false, status: 500, error: e?.message || String(e) };
  }
}
