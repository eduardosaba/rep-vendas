import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { prepareProductGallery } from '@/lib/utils/image-logic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const incomingBatch: any[] = body.batch || [];
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

    if (incomingBatch.length === 0) return NextResponse.json({ inserted: 0, updated: 0, errors: 0 });

    // Normalize owner for company members: if payload comes with user_id and this user belongs
    // to a company, force company scope to preserve multitenancy consistency.
    let batch: any[] = incomingBatch;
    const firstIncoming = incomingBatch[0] || {};
    const incomingUserId = firstIncoming?.user_id ? String(firstIncoming.user_id) : null;
    const incomingCompanyId = firstIncoming?.company_id ? String(firstIncoming.company_id) : null;

    if (!incomingCompanyId && incomingUserId) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', incomingUserId)
        .maybeSingle();

      const profileCompanyId = (ownerProfile as any)?.company_id ? String((ownerProfile as any).company_id) : null;
      if (profileCompanyId) {
        batch = incomingBatch.map((item) => ({
          ...item,
          company_id: profileCompanyId,
          user_id: incomingUserId,
        }));
      }
    }

    const first = batch[0] || {};
    const ownerField = first.company_id ? 'company_id' : 'user_id';
    const ownerId = first.company_id || first.user_id;
    if (!ownerId) {
      return NextResponse.json({ error: 'Missing owner in batch items' }, { status: 400 });
    }

    const mixedOwner = batch.some((item) => {
      const itemOwnerField = item.company_id ? 'company_id' : 'user_id';
      const itemOwnerId = item.company_id || item.user_id;
      return itemOwnerField !== ownerField || itemOwnerId !== ownerId;
    });

    if (mixedOwner) {
      return NextResponse.json(
        { error: 'Batch contains mixed owners. Split by owner before import.' },
        { status: 400 }
      );
    }

    // Build keys and fetch existing
    const keys = Array.from(new Set(batch.map((p) => p.reference_id || p.reference_code).filter(Boolean)));
    const existingMap: Record<string, any> = {};

    if (keys.length > 0) {
      const { data: byRefId } = await supabase
        .from('products')
        .select('id,reference_id,reference_code,slug,gallery_images,image_path,external_image_url')
        .eq(ownerField, ownerId)
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
          .eq(ownerField, ownerId)
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
          let query = supabase.from('products').update(safeFields).eq(ownerField, ownerId);
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
