import { DEMO_OPTICAL_PRODUCTS } from '@/data/demo-optical-catalog';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Product } from '@/lib/types';
import { SlugService } from '@/shared/slug/SlugService';

/**
 * Converte os 16 produtos ópticos de demonstração para a interface Product
 * permitindo que sejam exibidos imediatamente no Storefront do slug do usuário.
 */
export function getDemoOpticalProductsAsCatalogProducts(userId: string): Product[] {
  return DEMO_OPTICAL_PRODUCTS.map((demo, idx) => ({
    id: `demo-${demo.id}`,
    user_id: userId,
    name: demo.name,
    reference_code: demo.reference_code,
    reference_id: demo.reference_code,
    sku: demo.reference_code,
    brand: demo.brand,
    category: demo.category,
    price: demo.wholesale_price,
    sale_price: demo.suggested_retail_price,
    cost: Math.round(demo.wholesale_price * 0.6),
    description: demo.description,
    color: demo.color_name,
    material: demo.material,
    gender: (demo.gender.toLowerCase() === 'unissex' ? 'unisex' : demo.gender.toLowerCase()) as any,
    is_launch: Boolean(demo.is_launch),
    is_best_seller: Boolean(demo.is_bestseller),
    is_bestseller: Boolean(demo.is_bestseller),
    is_destaque: Boolean(demo.is_destaque),
    is_active: true,
    track_stock: false,
    stock_quantity: 50,
    external_image_url: demo.image_url,
    image_url: demo.image_url,
    images: [demo.image_url, demo.secondary_image_url].filter(Boolean) as string[],
    product_images: [
      { id: `img-1-${demo.id}`, url: demo.image_url, sync_status: 'synced', is_primary: true } as any,
      ...(demo.secondary_image_url ? [{ id: `img-2-${demo.id}`, url: demo.secondary_image_url, sync_status: 'synced', is_primary: false } as any] : []),
    ],
    technical_specs: {
      measurements: demo.measurements,
      frame_format: demo.frame_format,
      material: demo.material,
      gender: demo.gender,
    },
    variant_count: 1,
    created_at: new Date(Date.now() - idx * 60000).toISOString(),
  }));
}

/**
 * Persiste os 16 produtos de demonstração e suas marcas diretamente no PostgreSQL
 * para o usuário recém-criado, garantindo que o catálogo no slug do usuário e o
 * painel de produtos (/dashboard/products) já contenham os itens ativos.
 */
export async function seedDemoProductsForUser(
  userId: string,
  organizationId?: string | null,
  companyId?: string | null
): Promise<{ success: boolean; insertedCount: number }> {
  try {
    if (!userId) return { success: false, insertedCount: 0 };

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return { success: false, insertedCount: 0 };
    }

    const admin = createAdminClient();

    // 1. Checar se o usuário já tem produtos cadastrados
    const { count, error: countErr } = await admin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countErr) {
      console.warn('[seedDemoProductsForUser] Erro ao checar produtos existentes:', countErr.message);
    }

    if (typeof count === 'number' && count > 0) {
      // Já possui produtos, não sobrescrever
      return { success: true, insertedCount: 0 };
    }

    // 2. Criar as marcas padrão se não existirem
    const uniqueBrands = Array.from(new Set(DEMO_OPTICAL_PRODUCTS.map((p) => p.brand)));
    for (const brandName of uniqueBrands) {
      try {
        const { data: existingBrand } = await admin
          .from('brands')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', brandName)
          .maybeSingle();

        if (!existingBrand) {
          await admin.from('brands').insert({
            user_id: userId,
            organization_id: organizationId || null,
            company_id: companyId || null,
            name: brandName,
            is_active: true,
            logo_url: '/logo.png',
            created_at: new Date().toISOString(),
          });
        }
      } catch (brandErr) {
        // Não-impeditivo
      }
    }

    // 3. Criar as categorias padrão se não existirem
    const uniqueCategories = Array.from(new Set(DEMO_OPTICAL_PRODUCTS.map((p) => p.category)));
    for (const catName of uniqueCategories) {
      try {
        const { data: existingCat } = await admin
          .from('categories')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', catName)
          .maybeSingle();

        if (!existingCat) {
          await admin.from('categories').insert({
            user_id: userId,
            name: catName,
            created_at: new Date().toISOString(),
          });
        }
      } catch (catErr) {
        // Não-impeditivo
      }
    }

    // 4. Inserir os 16 produtos ópticos
    const productsPayload = DEMO_OPTICAL_PRODUCTS.map((demo) => {
      const slugBase = SlugService.generate(demo.name) || 'armacao';
      return {
        user_id: userId,
        organization_id: organizationId || null,
        company_id: companyId || null,
        name: demo.name,
        reference_code: demo.reference_code,
        reference_id: demo.reference_code,
        sku: demo.reference_code,
        brand: demo.brand,
        category: demo.category,
        price: demo.wholesale_price,
        sale_price: demo.suggested_retail_price,
        cost: Math.round(demo.wholesale_price * 0.6),
        description: demo.description,
        color: demo.color_name,
        material: demo.material,
        gender: demo.gender.toLowerCase() === 'unissex' ? 'unisex' : demo.gender.toLowerCase(),
        is_launch: Boolean(demo.is_launch),
        is_best_seller: Boolean(demo.is_bestseller),
        is_destaque: Boolean(demo.is_destaque),
        is_active: true,
        track_stock: false,
        stock_quantity: 50,
        image_url: demo.image_url,
        external_image_url: demo.image_url,
        images: [demo.image_url, demo.secondary_image_url].filter(Boolean),
        slug: `${slugBase}-${Math.random().toString(36).slice(-5)}`,
        technical_specs: {
          measurements: demo.measurements,
          frame_format: demo.frame_format,
          material: demo.material,
          gender: demo.gender,
        },
        created_at: new Date().toISOString(),
      };
    });

    const { data: inserted, error: insertError } = await admin
      .from('products')
      .insert(productsPayload)
      .select('id');

    if (insertError) {
      console.warn('[seedDemoProductsForUser] Erro ao inserir produtos de demo:', insertError.message);
      return { success: false, insertedCount: 0 };
    }

    return { success: true, insertedCount: inserted?.length || 0 };
  } catch (err: any) {
    console.warn('[seedDemoProductsForUser] Exceção:', err?.message || err);
    return { success: false, insertedCount: 0 };
  }
}
