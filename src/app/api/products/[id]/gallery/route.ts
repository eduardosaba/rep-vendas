import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { prepareProductGallery } from '@/lib/utils/image-logic';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: productId } = await params;
    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'urls array is required' }, { status: 400 });
    }

    // Normalize images to array of URLs
    const normalizedUrls = urls
      .map((it: any) => (typeof it === 'string' ? it : it?.url || null))
      .filter(Boolean);

    // Prepare rows for product_images
    const galleryItems = prepareProductGallery(productId, normalizedUrls);

    // Replace existing product_images for this product with the new set
    const { error: delError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);
    
    if (delError) {
      console.warn('syncProductGallery: failed to delete existing images', delError);
    }

    if (galleryItems.length > 0) {
      const { error: insError } = await supabase.from('product_images').insert(galleryItems);
      if (insError) {
        return NextResponse.json(
          { error: insError.message || String(insError) },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('syncProductGallery error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar galeria' },
      { status: 500 }
    );
  }
}