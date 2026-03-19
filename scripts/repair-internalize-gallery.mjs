#!/usr/bin/env node
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import https from 'https';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const RESPONSIVE_SIZES = [480, 1200];
const SIZE_OPTIONS = {
  480: { width: 480, quality: 70 },
  1200: { width: 1200, quality: 85 },
};
const BUCKET = 'product-images';

const id = process.argv[2];
if (!id) {
  console.error('Usage: node scripts/repair-internalize-gallery.mjs PRODUCT_ID');
  process.exit(1);
}

function isLikelyExternal(u) {
  if (!u) return false;
  try { const url = new URL(u); return !url.hostname.includes(new URL(SUPABASE_URL).hostname); } catch { return true; }
}

// Use a permissive agent to tolerate problematic TLS on some image hosts (matches local-sync-full.mjs behavior)
const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true, maxSockets: 50 });

async function processUrl(url, storageBase) {
  const res = await fetch(url, { timeout: 15000, agent });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  const variants = [];
  for (const size of RESPONSIVE_SIZES) {
    const outBuf = await sharp(buffer)
      .resize({ width: SIZE_OPTIONS[size].width, withoutEnlargement: true })
      .webp({ quality: SIZE_OPTIONS[size].quality })
      .toBuffer();
    const path = `${storageBase}-${size}w.webp`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, outBuf, { upsert: true, contentType: 'image/webp' });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    variants.push({ size, url: data.publicUrl, path });
  }
  return variants;
}

async function run() {
  const { data: product, error } = await supabase.from('products').select('id,reference_code,brand,gallery_images,image_path,image_variants').eq('id', id).maybeSingle();
  if (error) { console.error('Supabase error:', error); process.exit(2); }
  if (!product) { console.error('Product not found'); process.exit(3); }

  const gallery = Array.isArray(product.gallery_images) ? product.gallery_images : [];
  if (gallery.length === 0) {
    console.log('No gallery_images to repair.');
    return;
  }

  const repaired = [];
  for (let i = 0; i < gallery.length; i++) {
    const item = gallery[i];
    // find candidate url: prefer variants urls, then item.url
    let candidate = null;
    if (item && Array.isArray(item.variants) && item.variants.length) {
      for (const v of item.variants) if (v && v.url) { candidate = v.url; break; }
    }
    if (!candidate && item && item.url) candidate = item.url;
    if (!candidate) {
      console.warn('No candidate url for gallery item', i);
      repaired.push(item);
      continue;
    }

    // determine if existing path refers to a UUID-based internal path that we want to replace
    const existingPath = item && (item.path || (item.variants && item.variants[0] && item.variants[0].path));
    const forceReupload = existingPath && String(existingPath).includes(product.id);

    if (!isLikelyExternal(candidate) && !forceReupload) {
      // already internal and not matching product-id pattern — keep as-is
      repaired.push(item);
      continue;
    }

    // Build storage base using reference_code + optional color to avoid UUID filenames
    const refSafe = (product.reference_code || product.id).toString().replace(/[^a-zA-Z0-9]/g, '_');
    const colorSlugRaw = (product.color || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    // Avoid duplicating color if it's already present in the reference_code
    const refNorm = refSafe.toLowerCase().replace(/[_]+/g, '-');
    const includeColor = colorSlugRaw && !refNorm.endsWith('-' + colorSlugRaw) && !refNorm.endsWith(colorSlugRaw);
    // For gallery item i we use: public/brands/<brand-slug>/<refSafe>-<color?>-<index> with zero-padded 2 digits
    const indexPad = String(i + 1).padStart(2, '0');
    const brandSlug = String(product.brand || 'geral').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const storageBase = includeColor
      ? `public/brands/${brandSlug}/${refSafe}-${colorSlugRaw}-${indexPad}`
      : `public/brands/${brandSlug}/${refSafe}-${indexPad}`;
    try {
      console.log(`Processing gallery item ${i}: ${candidate}`);
      const variants = await processUrl(candidate, storageBase);
      const v480 = variants.find((v) => v.size === 480);
      const v1200 = variants.find((v) => v.size === 1200);
      repaired.push({ url: v1200.url, path: v1200.path, variants });
    } catch (e) {
      console.error('Failed to process', candidate, e.message || e);
      // keep original as fallback
      repaired.push(item);
    }
  }

  // if product has no image_path but repaired[0] exists, set as primary
  const updates = { gallery_images: repaired };
  if ((!product.image_path || product.image_path === null) && repaired.length > 0 && repaired[0].path) {
    updates.image_path = repaired[0].path.replace(/-480w.webp$/, '-1200w.webp');
    updates.image_variants = repaired[0].variants || [];
  }

  const { error: upErr } = await supabase.from('products').update(updates).eq('id', product.id);
  if (upErr) { console.error('Failed to update product:', upErr); process.exit(4); }

  console.log('Repair completed.');
}

run().catch((e) => { console.error(e); process.exit(5); });
