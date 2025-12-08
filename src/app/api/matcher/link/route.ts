import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabaseServer';

export async function POST(req: Request) {
  try {
    const nextCookies = await cookies();
    const supabase = createRouteSupabase(() => nextCookies);
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
      .single();

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
      .single();

    if (prodErr || !productRow) {
      return NextResponse.json({ error: 'product not found' }, { status: 404 });
    }

    const previousImage = productRow.image_url ?? null;

    // 1) atualizar produto
    const { error: updateErr } = await supabase
      .from('products')
      .update({ image_url: publicUrl })
      .eq('id', productId);

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
