import { NextResponse } from 'next/server';
import createClient from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: products, error } = await supabase
      .from('products')
      .select('id, image_url, images, reference_code')
      .eq('user_id', user.id);

    if (error) throw error;

    const storageMarker = '.supabase.co/storage';
    const pendingProducts = (products || []).filter((p: any) => {
      const isMainExt = p.image_url && !p.image_url.includes(storageMarker);
      const hasArrayExt =
        Array.isArray(p.images) &&
        p.images.some((img: string) => img && !img.includes(storageMarker));
      return isMainExt || hasArrayExt;
    });

    let successCount = 0;
    let failCount = 0;
    const logs: string[] = [];

    // process in small batches to avoid long-running requests
    for (const product of pendingProducts.slice(0, 20)) {
      try {
        let updatedImageUrl = product.image_url;
        let updatedImages = Array.isArray(product.images)
          ? [...product.images]
          : [];
        let changed = false;

        const internalize = async (url: string) => {
          if (!url || url.includes(storageMarker)) return url;

          const res = await fetch(url);
          if (!res.ok) throw new Error(`download failed ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = res.headers.get('content-type') || undefined;
          const ext = (url.split('.').pop() || 'jpg').split('?')[0];
          const fileName = `${user.id}/repair/${(product.reference_code || 'item').replace(/[^a-zA-Z0-9-_]/g, '_')}-${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, buffer, { contentType, upsert: true });

          if (uploadError) throw uploadError;

          const { data: publicUrl } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          return publicUrl?.publicUrl || null;
        };

        if (product.image_url && !product.image_url.includes(storageMarker)) {
          updatedImageUrl = await internalize(product.image_url);
          changed = true;
        }

        if (Array.isArray(product.images)) {
          const newImages: string[] = [];
          for (const imgUrl of product.images) {
            if (imgUrl && !imgUrl.includes(storageMarker)) {
              const newUrl = await internalize(imgUrl);
              newImages.push(newUrl || imgUrl);
              changed = true;
            } else {
              newImages.push(imgUrl);
            }
          }
          updatedImages = newImages;
        }

        if (changed) {
          await supabase
            .from('products')
            .update({
              image_url: updatedImageUrl,
              images: updatedImages,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id);
          successCount++;
        }
      } catch (e: any) {
        failCount++;
        logs.push(
          `Erro no produto ${product.reference_code || product.id}: ${String(e)}`
        );
      }
    }

    return NextResponse.json({
      message: 'Processamento concluído',
      success_count: successCount,
      fail_count: failCount,
      logs,
      remaining: Math.max(0, pendingProducts.length - 20),
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
