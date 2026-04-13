import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prepareProductGallery } from '@/lib/utils/image-logic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const batch: any[] = body.batch || [];
    const historyId: string | null = body.historyId || null;

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let totalInserted = 0;
    let totalUpdated = 0;
    let errorCount = 0;

    if (batch.length === 0) return NextResponse.json({ inserted: 0, updated: 0, errors: 0 });

    // Build keys and fetch existing
    const keys = Array.from(new Set(batch.map((p) => p.reference_id || p.reference_code).filter(Boolean)));
    const existingMap: Record<string, any> = {};

    if (keys.length > 0) {
      const { data: byRefId } = await supabase
        .from('products')
        .select('id,reference_id,reference_code,slug,gallery_images,image_path,external_image_url')
        .in('reference_id', keys as any[]);
      if (Array.isArray(byRefId)) {
        byRefId.forEach((p: any) => {
          const key = p.reference_id || p.reference_code;
          if (key) existingMap[key] = p;
        });
      }

      const stillMissing = keys.filter((k) => !existingMap[k]);
      if (stillMissing.length > 0) {
        const { data: byRefCode } = await supabase
          .from('products')
          .select('id,reference_id,reference_code,slug,gallery_images,image_path,external_image_url')
          .in('reference_code', stillMissing as any[]);
        if (Array.isArray(byRefCode)) {
          byRefCode.forEach((p: any) => {
            const key = p.reference_id || p.reference_code;
            if (key) existingMap[key] = p;
          });
        }
      }
    }

    // Split into inserts and updates
    const toInsert = batch.filter((it) => {
      const key = it.reference_id || it.reference_code;
      return !existingMap[key];
    });
    const toUpdate = batch.filter((it) => {
      const key = it.reference_id || it.reference_code;
      return !!existingMap[key];
    });

    // Insert new products
    if (toInsert.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from('products')
        .insert(toInsert)
        .select('id, external_image_url, reference_id, reference_code');
      if (insertErr) {
        errorCount += toInsert.length;
      } else if (inserted && Array.isArray(inserted)) {
        inserted.forEach((p: any) => {
          const key = p.reference_id || p.reference_code;
          if (key) existingMap[key] = p;
        });
        totalInserted += inserted.length;
      }
    }

    // Update existing products (non-destructive)
    if (toUpdate.length > 0) {
      for (const itm of toUpdate) {
        try {
          const safeFields: any = {
            price: itm.price,
            sale_price: itm.sale_price,
            sku: itm.sku ?? null,
            barcode: itm.barcode ?? null,
            stock_quantity: itm.stock_quantity ?? null,
          };
          let query = supabase.from('products').update(safeFields).eq('user_id', itm.user_id);
          if (itm.reference_id) query = query.eq('reference_id', itm.reference_id);
          else query = query.eq('reference_code', itm.reference_code);
          const { data: updated, error: updErr } = await query.select('id, external_image_url, reference_id, reference_code');
          if (updErr) {
            errorCount += 1;
          } else if (updated && Array.isArray(updated)) {
            updated.forEach((p: any) => {
              const key = p.reference_id || p.reference_code;
              if (key) existingMap[key] = p;
            });
            totalUpdated += updated.length;
          }
        } catch (e) {
          errorCount += 1;
        }
      }
    }

    // Prepare gallery inserts
    const allImagesToInsert: any[] = [];
    for (const originalItem of batch) {
      const key = originalItem.reference_id || originalItem.reference_code;
      const p = existingMap[key];
      const productId = p ? p.id : undefined;
      const externalUrl = p ? p.external_image_url : originalItem.external_image_url;

      const allImages = [] as string[];
      if (externalUrl) allImages.push(externalUrl);
      if (originalItem.images && Array.isArray(originalItem.images)) {
        allImages.push(...originalItem.images);
      } else if (p && p.gallery_images && Array.isArray(p.gallery_images)) {
        allImages.push(...p.gallery_images.map((g: any) => (typeof g === 'string' ? g : g.url || g.path)));
      } else if (p && p.image_path) {
        allImages.unshift(p.image_path);
      }

      if (productId && allImages.length > 0) {
        const galleryItems = prepareProductGallery(productId, allImages);
        allImagesToInsert.push(...galleryItems);
      }
    }

    // Dedupe images by product_id::url
    let galleryInserted = 0;
    if (allImagesToInsert.length > 0) {
      const seen = new Set<string>();
      const out: any[] = [];
      for (const img of allImagesToInsert) {
        const rawUrl = (img.url || img.path || '').toString();
        const url = rawUrl.trim();
        if (!url) continue;
        const key = `${img.product_id}::${url}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ ...img, url });
        }
      }

      const galleryChunkSize = 200;
      for (let k = 0; k < out.length; k += galleryChunkSize) {
        const chunk = out.slice(k, k + galleryChunkSize);
        const { error: galleryError } = await supabase.from('product_images').insert(chunk);
        if (!galleryError) galleryInserted += chunk.length;
      }
    }

    return NextResponse.json({ inserted: totalInserted, updated: totalUpdated, galleryInserted, errors: errorCount });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
