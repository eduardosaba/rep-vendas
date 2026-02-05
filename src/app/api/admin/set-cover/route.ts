import { createClient as createServerClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, productImageId } = body || {};
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    if (!productId || !productImageId) {
      return NextResponse.json(
        { error: 'Missing productId or productImageId' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createServerClient(supabaseUrl, serviceKey);

    // Fetch the chosen product_image
    const { data: chosen, error: chosenErr } = await supabaseAdmin
      .from('product_images')
      .select('*')
      .eq('id', productImageId)
      .eq('product_id', productId)
      .maybeSingle();

    if (chosenErr) {
      console.error('[set-cover] fetch chosen error', chosenErr);
      return NextResponse.json(
        { success: false, error: chosenErr.message },
        { status: 500 }
      );
    }
    if (!chosen) {
      return NextResponse.json(
        { success: false, error: 'product_image not found' },
        { status: 404 }
      );
    }

    // Determine canonical optimized url/path/variants
    const optimizedUrl =
      chosen.optimized_url ||
      (chosen.optimized_variants && chosen.optimized_variants.length
        ? chosen.optimized_variants[chosen.optimized_variants.length - 1].url
        : null);
    const optimizedPath =
      chosen.storage_path ||
      (chosen.optimized_variants && chosen.optimized_variants.length
        ? chosen.optimized_variants[chosen.optimized_variants.length - 1].path
        : null);
    const optimizedVariants = chosen.optimized_variants || null;

    // Fetch other synced images to build gallery_images
    const { data: galleryRows } = await supabaseAdmin
      .from('product_images')
      .select('id, optimized_url, storage_path')
      .eq('product_id', productId)
      .eq('sync_status', 'synced')
      .order('position', { ascending: true });

    const galleryImages = (galleryRows || [])
      .filter((r: any) => r.id !== chosen.id)
      .map((r: any) => ({
        url: r.optimized_url || null,
        path: r.storage_path || null,
      }))
      .filter((r: any) => !!r.url || !!r.path);

    // Update product row: set cover fields and gallery_images
    const updates: any = {
      image_url: optimizedUrl,
      image_path: optimizedPath,
      image_variants: optimizedVariants,
      image_optimized: true,
      gallery_images: galleryImages,
      sync_status: 'synced',
    };

    const { error: updateErr } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', productId);

    if (updateErr) {
      console.error('[set-cover] update product error', updateErr);
      return NextResponse.json(
        { success: false, error: updateErr.message },
        { status: 500 }
      );
    }

    // Mark is_primary in product_images
    try {
      await supabaseAdmin
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);
      await supabaseAdmin
        .from('product_images')
        .update({ is_primary: true })
        .eq('id', chosen.id);
    } catch (e) {
      console.warn('[set-cover] warning updating is_primary', e);
    }

    // Trigger cache revalidation for public catalog if available
    try {
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('user_id')
        .eq('id', productId)
        .maybeSingle();

      if (prod && prod.user_id) {
        const { data: pc } = await supabaseAdmin
          .from('public_catalogs')
          .select('slug')
          .eq('user_id', prod.user_id)
          .maybeSingle();

        if (pc && pc.slug) {
          try {
            await fetch(`/api/revalidate?slug=${encodeURIComponent(pc.slug)}`, {
              method: 'POST',
            });
          } catch (e) {
            console.warn('[set-cover] revalidate failed', e);
          }
        }
      }
    } catch (e) {
      console.warn('[set-cover] revalidate step failed', e);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[set-cover] unexpected', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
