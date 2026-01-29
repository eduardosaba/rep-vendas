import { NextResponse } from 'next/server';
import createClient from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storageMarker = '.supabase.co/storage';

    // OTIMIZAÇÃO: Filtramos no banco produtos que NÃO possuem o marcador no image_url
    // Isso reduz drasticamente a quantidade de dados trafegados.
    // allow client to pass product_ids or filters to limit scope
    const body = await req.json().catch(() => ({}));
    const productIds: string[] | undefined = body?.product_ids;
    const brand: string | undefined = body?.brand;
    const search: string | undefined = body?.search;

    let query = supabase
      .from('products')
      .select('id, image_url, images, reference_code, brand, image_path')
      .eq('user_id', user.id);

    // apply product_ids if provided (limit scope explicitly)
    if (Array.isArray(productIds) && productIds.length > 0) {
      query = query.in('id', productIds);
    } else {
      // default: only candidates whose main image or images array are external OR missing image_path
      query = query.or(
        `image_url.not.ilike.%${storageMarker}%,image_url.is.null`
      );
    }

    // apply brand filter if present
    if (brand) {
      // use exact match for brand to avoid unexpected partials
      query = query.eq('brand', brand);
    }

    // apply search filter if present (search in name or reference_code)
    if (search) {
      const q = `%${search.replace(/%/g, '\\%')}%`;
      query = query.or(`name.ilike.${q},reference_code.ilike.${q}`);
    }

    const { data: products, error } = await query;

    if (error) throw error;

    // Filter pending products: only those that still have external images
    const pendingProducts = (products || []).filter((p: any) => {
      // if product already has image_path (server-side stored), consider internal
      if (p.image_path) return false;

      const isMainExt = p.image_url && !p.image_url.includes(storageMarker);
      const hasArrayExt =
        Array.isArray(p.images) &&
        p.images.some((img: any) => {
          const url = typeof img === 'string' ? img : img?.url;
          return url && !url.includes(storageMarker);
        });
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
          if (!res.ok) throw new Error(`Download falhou: ${res.status}`);
          const arrayBuffer = await res.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = res.headers.get('content-type') || 'image/jpeg';

          const ext = (url.split('.').pop() || 'jpg')
            .split('?')[0]
            .toLowerCase();
          // Sanitização do nome do arquivo para evitar caracteres especiais
          const safeRef = (product.reference_code || 'item').replace(
            /[^a-zA-Z0-9]/g,
            '_'
          );
          const fileName = `${user.id}/repair/${safeRef}-${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, buffer, { contentType, upsert: true });

          if (uploadError) throw uploadError;

          const { data: publicUrl } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);

          return { publicUrl: publicUrl?.publicUrl || null, path: fileName };
        };

        let uploadedPath: string | null = null;
        if (product.image_url && !product.image_url.includes(storageMarker)) {
          const r = await internalize(product.image_url);
          if (r) {
            updatedImageUrl = (r as any).publicUrl || null;
            uploadedPath = (r as any).path || null;
            changed = true;
          }
        }

        if (Array.isArray(product.images)) {
          const newImages: string[] = [];
          for (const imgEntry of product.images) {
            const imgUrl =
              typeof imgEntry === 'string' ? imgEntry : imgEntry?.url;
            if (imgUrl && !imgUrl.includes(storageMarker)) {
              const r = await internalize(imgUrl);
              const newUrl = r ? (r as any).publicUrl || imgUrl : imgUrl;
              newImages.push(newUrl);
              if (!uploadedPath && r && (r as any).path)
                uploadedPath = (r as any).path;
              changed = true;
            } else {
              newImages.push(imgUrl);
            }
          }
          updatedImages = newImages;
        }

        if (changed) {
          const updatePayload: any = {
            image_url: updatedImageUrl,
            images: updatedImages,
            updated_at: new Date().toISOString(),
          };
          if (uploadedPath) updatePayload.image_path = uploadedPath;

          await supabase
            .from('products')
            .update(updatePayload)
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
