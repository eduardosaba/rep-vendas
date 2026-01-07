#!/usr/bin/env node
/*
  Script de rollback para migração de storage.
  Espera um arquivo JSON de mapeamento com entries:
    [{ table, id, field, oldValue, newValue, oldPath?, newPath?, bucket? }, ...]

  Uso:
    NEXT_PUBLIC_SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> node scripts/migrate-storage-rollback.mjs --map=backup.json --dry

  O script tentará reverter arquivos movendo do newPath para oldPath (faz download/upload)
  e atualizar os campos no banco para `oldValue`.
*/

import fs from 'fs';
import process from 'process';
import { createClient } from '@supabase/supabase-js';

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
const MAP_FILE = argv.map || argv.m;
const DRY = argv.dry === true || argv.dry === 'true';
if (!MAP_FILE) {
  console.error('Missing --map=backup.json');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function fetchBufferFromPublicUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('fetch failed ' + res.status);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function moveObject(bucket, srcPath, destPath) {
  // download signed url then upload to dest and remove src
  const { data: sdata } = await supabase.storage
    .from(bucket)
    .createSignedUrl(srcPath, 60);
  const res = await fetch(sdata.signedURL);
  if (!res.ok) throw new Error('download failed ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(bucket)
    .upload(destPath, buf, { upsert: true });
  if (upErr) throw upErr;
  const { error: delErr } = await supabase.storage
    .from(bucket)
    .remove([srcPath]);
  if (delErr) throw delErr;
}

(async function main() {
  console.log('Rollback using mapping:', MAP_FILE, 'Dry:', DRY);
  const raw = fs.readFileSync(MAP_FILE, 'utf-8');
  const items = JSON.parse(raw);
  for (const it of items) {
    const {
      table,
      id,
      field,
      oldValue,
      newValue,
      oldPath,
      newPath,
      bucket = 'product-images',
    } = it;
    try {
      console.log('Reverting', table, id, field);
      if (newPath && oldPath) {
        console.log(
          ' -> move',
          newPath,
          'back to',
          oldPath,
          'in bucket',
          bucket
        );
        if (!DRY) await moveObject(bucket, newPath, oldPath);
      }
      // update DB
      if (!DRY) {
        const updates = {};
        updates[field] = oldValue;
        const { error } = await supabase
          .from(table)
          .update(updates)
          .eq('id', id);
        if (error) console.error('DB update error', error);
        else console.log(' -> DB updated');
      } else {
        console.log(
          '[DRY] -> would update DB',
          table,
          id,
          'set',
          field,
          '->',
          oldValue
        );
      }
    } catch (e) {
      console.error('Error reverting item', it, e.message || e);
    }
  }
  console.log('Rollback finished.');
})();
