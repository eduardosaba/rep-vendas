import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const nextCookies = await cookies();
    const supabase = await createRouteSupabase(() => nextCookies);
    const body = await req.json();
    const { productId, stagingImageId } = body || {};

    if (!productId || !stagingImageId) {
      return NextResponse.json(
        { error: 'productId and stagingImageId are required' },
        { status: 400 }
      );
    }

    // Buscar staging image
    const { data: imgRow, error: imgErr } = await supabase
      .from('staging_images')
      .select('storage_path, original_name')
      .eq('id', stagingImageId)
      .maybeSingle();

    if (imgErr || !imgRow) {
      return NextResponse.json(
        { error: 'staging image not found' },
        { status: 404 }
      );
    }

    // Construir URL pública a partir do storage
    const { data: publicData } = supabase.storage
      .from('product-images')
      .getPublicUrl(imgRow.storage_path);
    const publicUrl = publicData?.publicUrl || null;

    // Ler product atual para possível rollback
    const { data: productRow, error: prodErr } = await supabase
      .from('products')
      .select('id, image_url')
      .eq('id', productId)
      .maybeSingle();

    if (prodErr || !productRow) {
      return NextResponse.json({ error: 'product not found' }, { status: 404 });
    }

    const previousImage = productRow.image_url ?? null;

    // 1) Atualizar produto: append inteligente em `gallery_images` e setar `image_variants` se faltar capa
    const { data: currentProd } = await supabase
      .from('products')
      .select('image_variants, gallery_images, linked_images')
      .eq('id', productId)
      .maybeSingle();

    const ensure480 = (u: string) => {
      if (!u) return u;
      if (/-1200w(\.|$)/.test(u)) return u.replace(/-1200w(\.|$)/, '-480w$1');
      return u.replace(/(\.[a-z0-9]+)(\?|$)/i, '-480w$1');
    };

    const built = {
      url: publicUrl,
      path: imgRow.storage_path || null,
      variants: [
        { url: ensure480(publicUrl || ''), path: imgRow.storage_path ? ensure480(imgRow.storage_path) : null, size: 480 },
        { url: publicUrl, path: imgRow.storage_path || null, size: 1200 },
      ],
    };

    const currentCover = Array.isArray(currentProd?.image_variants)
      ? currentProd!.image_variants
      : [];
    const currentGallery = Array.isArray(currentProd?.gallery_images)
      ? currentProd!.gallery_images
      : [];

    const mergedGallery = [...currentGallery];
    const exists = mergedGallery.some((it: any) => (it.path && built.path && it.path === built.path) || it.url === built.url);
    if (!exists) mergedGallery.push({ url: built.url, path: built.path, variants: built.variants });

    const updates: any = {
      gallery_images: mergedGallery,
      linked_images: Array.from(new Set([...(currentProd?.linked_images || []), built.url])),
      sync_status: 'synced',
      updated_at: new Date().toISOString(),
    };

    if (!currentCover || currentCover.length === 0) {
      updates.image_variants = built.variants;
      updates.image_url = built.url;
    }

    const { error: updateErr } = await supabase.from('products').update(updates).eq('id', productId);

    if (updateErr)
      return NextResponse.json(
        { error: 'failed to update product', details: updateErr },
        { status: 500 }
      );

    // 2) remover staging
    const { error: deleteErr } = await supabase
      .from('staging_images')
      .delete()
      .eq('id', stagingImageId);

    if (deleteErr) {
      // tentar rollback do produto
      try {
        await supabase
          .from('products')
          .update({ image_url: previousImage })
          .eq('id', productId);
      } catch (rollbackErr) {
        // fallback: reportar erro e continuar
      }
      return NextResponse.json(
        { error: 'failed to delete staging image', details: deleteErr },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      productId,
      stagingImageId,
      publicUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'internal error', details: String(err) },
      { status: 500 }
    );
  }
}
