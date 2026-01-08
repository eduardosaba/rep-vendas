#!/usr/bin/env node
/*
  Gerador de thumbnails para imagens no bucket Supabase.
  Requisitos: Node 18+, instalar dependências: npm i sharp @supabase/supabase-js

  Uso (exemplo):
    NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/generate-thumbnails.mjs --bucket=product-images --dry --limit=100

  Comportamento:
    - Lista objetos do bucket (prefix opcional)
    - Para cada imagem, baixa, gera thumbnail (max 800px largura), e faz upload para path `thumbnails/<original-path>`
    - Opcional `--dry` para apenas simular
*/

import process from 'process';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment'
  );
  process.exit(1);
}

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.split('=');
    return [k.replace(/^--/, ''), v ?? true];
  })
);
const DRY = argv.dry === true || argv.dry === 'true';
const LIMIT = argv.limit ? Number(argv.limit) : null;
const BUCKET = argv.bucket || 'product-images';
const PREFIX = argv.prefix || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function listFiles(prefix = '') {
  const files = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const res = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: pageSize, offset: from });
    if (res.error) throw res.error;
    const data = res.data || [];
    for (const item of data) {
      // build candidate path
      const candidate = prefix ? `${prefix}/${item.name}` : item.name;
      // try to list inside candidate to see if it's a folder
      const child = await supabase.storage
        .from(BUCKET)
        .list(candidate, { limit: 1, offset: 0 });
      if (!child.error && child.data && child.data.length > 0) {
        // it's a folder-like item, recurse
        await walk(candidate);
      } else {
        // treat as file
        files.push(candidate);
      }
    }
  }

  async function walk(pfx) {
    const res = await supabase.storage
      .from(BUCKET)
      .list(pfx, { limit: 1000, offset: 0 });
    if (res.error) throw res.error;
    const data = res.data || [];
    for (const item of data) {
      // build candidate path
      const candidate = pfx ? `${pfx}/${item.name}` : item.name;
      // try to list inside candidate to see if it's a folder
      const child = await supabase.storage
        .from(BUCKET)
        .list(candidate, { limit: 1, offset: 0 });
      if (!child.error && child.data && child.data.length > 0) {
        // it's a folder-like item, recurse
        await walk(candidate);
      } else {
        // treat as file
        files.push(candidate);
      }
    }
  }

  await walk(prefix);
  return files;
}

async function createThumbnailFor(path) {
  try {
    const { data: sdata, error: sErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60);
    if (sErr) throw sErr;
    const res = await fetch(sdata.signedURL);
    if (!res.ok) throw new Error('fetch failed ' + res.status);
    const buf = await res.arrayBuffer();
    const input = Buffer.from(buf);
    const thumb = await sharp(input)
      .resize({ width: 800, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const thumbPath = 'thumbnails/' + path;
    if (DRY) {
      console.log('[DRY] -> would upload thumbnail to', thumbPath);
      return { path: thumbPath };
    }

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(thumbPath, thumb, { upsert: true, contentType: 'image/jpeg' });
    if (upErr) throw upErr;
    const { data: pu } = await supabase.storage
      .from(BUCKET)
      .getPublicUrl(thumbPath);
    return { path: thumbPath, publicUrl: pu.publicUrl };
  } catch (e) {
    console.warn('thumb failed for', path, e.message || e);
    return null;
  }
}

(async function main() {
  console.log(
    'Generate thumbnails. Dry:',
    DRY,
    'Bucket:',
    BUCKET,
    'Prefix:',
    PREFIX,
    'Limit:',
    LIMIT
  );
  try {
    const files = await listFiles(PREFIX);
    console.log('Found', files.length, 'items (listing may include folders).');
    const images = files
      .filter((p) => /\.(jpe?g|png|webp|avif|gif)$/i.test(p))
      .slice(0, LIMIT || undefined);
    console.log('Processing', images.length, 'images');
    let i = 0;
    for (const img of images) {
      i++;
      console.log(`${i}/${images.length} -> ${img}`);
      await createThumbnailFor(img);
      await sleep(120);
    }
    console.log('Done.');
  } catch (e) {
    console.error('Error', e);
  }
})();
