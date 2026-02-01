import { NextResponse } from 'next/server';
import createClient from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const storageMarker = '.supabase.co/storage';

    // Support Cron Job access via secret key (in header Bearer or body.key / query ?key=)
    const authHeader = req.headers.get('authorization');
    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const body = await req.json().catch(() => ({}));
    const providedKey =
      (authHeader && authHeader.replace(/^Bearer\s+/i, '')) ||
      body?.key ||
      searchParams.get('key');

    const isCron = !!(
      providedKey &&
      process.env.CRON_SECRET &&
      providedKey === process.env.CRON_SECRET
    );

    let supabase: any;
    let user: any = null;

    if (isCron) {
      // Use service role for cron operations
      const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!SUPA_URL || !SERVICE_KEY)
        return NextResponse.json(
          { error: 'Service role key not configured' },
          { status: 500 }
        );
      supabase = createServiceClient(SUPA_URL, SERVICE_KEY);
    } else {
      supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
      if (!user)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // allow client to pass product_ids or filters to limit scope
    const productIds: string[] | undefined = body?.product_ids;
    const brand: string | undefined =
      body?.brand || searchParams.get('brand') || undefined;
    const search: string | undefined =
      body?.search || searchParams.get('search') || undefined;
    const requestedLimit =
      Number(body?.limit ?? searchParams.get('limit')) || undefined;
    const limit = Math.max(1, Math.min(requestedLimit || 20, 500));

    // Prefer processing items explicitly marked as pending first (recent imports)
    let products: any[] | null = null;

    const selectCols =
      'id, user_id, name, image_url, images, reference_code, brand, image_path, sync_status';

    if (Array.isArray(productIds) && productIds.length > 0) {
      const { data: byIds } = await supabase
        .from('products')
        .select(selectCols)
        .in('id', productIds)
        .limit(100);
      products = byIds as any[];
    } else {
      // First try: items explicitly marked as 'pending' (high priority)
      const { data: pending } = await supabase
        .from('products')
        .select(selectCols)
        .eq('sync_status', 'pending')
        .limit(limit || 20);

      if (pending && pending.length > 0) {
        products = pending as any[];
      } else {
        // Fallback: scan for candidates with external URLs or missing image_path
        const { data: fallback } = await supabase
          .from('products')
          .select(selectCols)
          .or(`image_url.not.ilike.%${storageMarker}%,image_url.is.null`)
          .limit(Math.max(100, limit));
        products = fallback as any[];
      }
    }

    // Apply in-memory filters for brand and search (safer and simpler)
    if (brand) {
      products = (products || []).filter(
        (p: any) =>
          String(p.brand || '').toLowerCase() === String(brand).toLowerCase()
      );
    }
    if (search) {
      const q = String(search).toLowerCase();
      products = (products || []).filter((p: any) =>
        (String(p.name || '') + ' ' + String(p.reference_code || ''))
          .toLowerCase()
          .includes(q)
      );
    }

    // From the candidate products, keep only those that still have external images
    const pendingProducts = (products || []).filter((p: any) => {
      // if product already has image_path and sync_status is 'synced', skip
      if (p.image_path && p.sync_status === 'synced') return false;

      const isMainExt = p.image_url && !p.image_url.includes(storageMarker);
      const hasArrayExt =
        Array.isArray(p.images) &&
        p.images.some((img: any) => {
          const url = typeof img === 'string' ? img : img?.url;
          const path = typeof img === 'object' && img ? img.path : null;
          return url && !url.includes(storageMarker) && !path;
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
        let updatedImages: any[] = Array.isArray(product.images)
          ? [...product.images]
          : [];
        let changed = false;

        const internalize = async (url: string, prod: any) => {
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
          const ownerId =
            (user && user.id) || prod.user_id || prod.userId || 'unknown';
          const safeRef = (prod.reference_code || prod.id || 'item').replace(
            /[^a-zA-Z0-9]/g,
            '_'
          );
          const fileName = `${ownerId}/repair/${safeRef}-${Date.now()}.${ext}`;

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
          const r = await internalize(product.image_url, product);
          if (r) {
            updatedImageUrl = (r as any).publicUrl || null;
            uploadedPath = (r as any).path || null;
            changed = true;
          }
        }

        if (Array.isArray(product.images)) {
          const newImages: any[] = [];
          for (const imgEntry of product.images) {
            const isObj = imgEntry && typeof imgEntry === 'object';
            const imgUrl = isObj ? imgEntry.url : imgEntry;
            const imgPath = isObj ? imgEntry.path : null;

            if (imgUrl && !imgUrl.includes(storageMarker) && !imgPath) {
              const r = await internalize(imgUrl, product);
              const newUrl = r ? (r as any).publicUrl || imgUrl : imgUrl;
              const newPath = r ? (r as any).path || null : null;
              newImages.push({
                url: newUrl,
                path: newPath,
                sync_status: 'synced',
              });
              if (!uploadedPath && newPath) uploadedPath = newPath;
              changed = true;
            } else if (isObj) {
              // Preserve object structure, but mark as synced if already internal
              newImages.push({
                url: imgEntry.url || null,
                path: imgEntry.path || null,
                sync_status: imgEntry.path
                  ? 'synced'
                  : imgEntry.sync_status || null,
              });
            } else {
              // string entry (already internal or external but has no path)
              if (imgUrl && imgUrl.includes(storageMarker)) {
                newImages.push(imgUrl);
              } else {
                // external string without path — keep as object to standardize
                newImages.push({
                  url: imgUrl || null,
                  path: null,
                  sync_status: null,
                });
              }
            }
          }
          updatedImages = newImages;
        }

        if (changed) {
          const updatePayload: any = {
            image_url: updatedImageUrl,
            images: updatedImages,
            updated_at: new Date().toISOString(),
            // mark as internalized/optimized
            image_optimized: true,
            sync_status: 'synced',
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

export async function GET(req: Request) {
  // Allow GET to trigger the same processing (useful for cron jobs hitting the URL)
  return await POST(req as any);
}
