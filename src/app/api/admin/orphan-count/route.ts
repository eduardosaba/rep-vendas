import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const brand = url.searchParams.get('brand')?.trim() || '';
    const status = url.searchParams.get('status')?.trim() || '';
    const debugFlag = url.searchParams.get('debug');
    if (!brand || !status)
      return NextResponse.json({ error: 'brand and status required' }, { status: 400 });

    // Basic validation: avoid extremely long values being forwarded to DB
    if (brand.length > 200) {
      return NextResponse.json({ error: 'brand value too long' }, { status: 400 });
    }

    // Normalize status parameter and allow common misspellings/variants
    const normalizeStatusVariants = (s: string) => {
      const v = (s || '').toLowerCase().trim();
      if (!v) return [];
      const variants = new Set<string>();
      variants.add(v);
      // common typo observed in DB: 'syced' instead of 'synced'
      if (v === 'synced') variants.add('syced');
      if (v === 'syced') variants.add('synced');
      return Array.from(variants);
    };

    const statusVariants = normalizeStatusVariants(status);
    if (statusVariants.length === 0) {
      return NextResponse.json({ error: 'invalid status value' }, { status: 400 });
    }

    // Remove debug early-return in production/dev flow to avoid leaking internal state

    // Use service role client for admin queries to bypass RLS and ensure full visibility
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let supabase: any;
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      supabase = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } else {
      // fallback to server client (may be subject to RLS)
      supabase = await createClient();
    }

    // 1) fetch products for brand+status variants (include image_url so we can filter in JS)
    const { data: prods, error: pErr } = await supabase
      .from('products')
      .select('id,image_url')
      .eq('brand', brand)
      .in('sync_status', statusVariants as any[]);
    if (pErr) {
      console.error('[orphan-count] products query error', { brand, status, error: pErr });
      return NextResponse.json({ error: 'products query error' }, { status: 500 });
    }

    const prodsList = prods || [];
    // consider orphan candidates those with null/empty image_url
    const orphanCandidates = prodsList
      .filter((p: any) => !p.image_url || String(p.image_url).trim() === '')
      .map((p: any) => p.id);

    // debug logging removed

    if (orphanCandidates.length === 0) return NextResponse.json({ orphan: 0 });

    // 2) find product_ids among candidates that have at least one product_images (any status)
    // Also consider cloned products: if a product is a clone and its source_product_id has images,
    // the clone should not be considered orphan.
    // Query in batches to avoid very large `IN` arrays causing issues
    const hasImage = new Set<string>();
    // map from source_product_id -> array of cloned_product_id
    const sourceToClones: Record<string, string[]> = {};
    try {
      // Reduce batch size to avoid PostgREST / Supabase "Bad Request" on large IN lists
      const BATCH = 200;
      // 2a) fetch catalog_clones mappings for cloned products in our candidate list
      for (let i = 0; i < orphanCandidates.length; i += BATCH) {
        const chunk = orphanCandidates.slice(i, i + BATCH);
        const { data: mapsChunk, error: mErr } = await supabase
          .from('catalog_clones')
          .select('source_product_id, cloned_product_id')
          .in('cloned_product_id', chunk as any[]);
        if (mErr) {
          console.error('[orphan-count] catalog_clones chunk error', { brand, status, chunkLength: chunk.length, error: mErr });
          // non-fatal: continue without clone mappings
        } else {
          (mapsChunk || []).forEach((r: any) => {
            const src = String(r.source_product_id);
            const cl = String(r.cloned_product_id);
            if (!sourceToClones[src]) sourceToClones[src] = [];
            sourceToClones[src].push(cl);
          });
        }
      }
      for (let i = 0; i < orphanCandidates.length; i += BATCH) {
        const chunk = orphanCandidates.slice(i, i + BATCH);
        // check product_images for these product ids (any sync_status)
        const { data: imgsChunk, error: iErr } = await supabase
          .from('product_images')
          .select('product_id')
          .in('product_id', chunk as any[]);
        if (iErr) {
          console.error('[orphan-count] product_images chunk error', { brand, status, chunkLength: chunk.length, error: iErr });
          return NextResponse.json({ error: 'product_images query error' }, { status: 500 });
        }
        (imgsChunk || []).forEach((r: any) => {
          const srcId = String(r.product_id);
          hasImage.add(srcId);
          // if this product is a source for clones, mark clones as having images too
          const clones = sourceToClones[srcId];
          if (Array.isArray(clones)) clones.forEach((c) => hasImage.add(c));
        });
      }
    } catch (e: any) {
      console.error('[orphan-count] error while fetching product_images', e);
      const msg = process.env.NODE_ENV === 'production' ? 'error fetching product images' : (e?.message || String(e));
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    const orphan = orphanCandidates.filter((id: unknown) => !hasImage.has(String(id))).length;

    return NextResponse.json({ orphan });
  } catch (err: any) {
    console.error('[orphan-count] unhandled error', err);
    // In dev, return full error details to help debugging. In prod, keep terse.
    if (process.env.NODE_ENV !== 'production') {
      const payload: any = { error: err?.message || String(err) };
      try {
        if (err && typeof err === 'object') {
          payload.errorObject = JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)));
        }
      } catch (_) {}
      if (err?.stack) payload.stack = err.stack;
      return NextResponse.json(payload, { status: 500 });
    }

    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
