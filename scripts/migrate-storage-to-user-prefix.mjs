import fs from 'fs';
import path from 'path';
import process from 'process';
import { createClient } from '@supabase/supabase-js';

// Usage: node scripts/migrate-storage-to-user-prefix.mjs --dry --limit=100

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.split('=');
    return [k.replace(/^--/, ''), v ?? true];
  })
);
const DRY = argv.dry === true || argv.dry === 'true';
const LIMIT = argv.limit ? Number(argv.limit) : null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBufferFromSignedUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function getBufferFromValue(
  val,
  fallbackBuckets = ['product-images', 'products', 'avatars']
) {
  // val may be: storage path (e.g. public/<userId>/... or products/...), or a publicUrl
  if (!val) return null;
  if (typeof val !== 'string') return null;
  try {
    const u = new URL(val);
    // try to detect bucket/path from public url
    const parts = u.pathname.split('/').filter(Boolean);
    // look for 'object' 'public' bucket path pattern: /storage/v1/object/public/<bucket>/<path...>
    const idx = parts.indexOf('public');
    if (idx !== -1 && parts.length > idx + 1) {
      const bucket = parts[idx + 1];
      const pathParts = parts.slice(idx + 2);
      const objectPath = pathParts.join('/');
      // create signed url
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(objectPath, 60);
      if (data?.signedURL) {
        return await fetchBufferFromSignedUrl(data.signedURL);
      }
    }
    // fallback: try to fetch directly
    return await fetchBufferFromSignedUrl(val);
  } catch (e) {
    // not a url, treat as storage path
    const storagePath = val.replace(/^\//, '');
    for (const bucket of fallbackBuckets) {
      try {
        const { data } = await supabase.storage
          .from(bucket)
          .createSignedUrl(storagePath, 60);
        if (data?.signedURL) {
          return await fetchBufferFromSignedUrl(data.signedURL);
        }
      } catch (_) {
        // try next
      }
    }
    // give up
    return null;
  }
}

function extractExtFromFilename(name) {
  const m = name.match(/\.([a-zA-Z0-9]{2,6})(?:\?|$)/);
  if (m) return m[1];
  return 'jpg';
}

async function uploadBufferToBucket(bucket, filePath, buffer, opts = {}) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, { upsert: true, contentType: opts.contentType });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  return { publicUrl: data.publicUrl, path: filePath };
}

async function migrateTableField({
  table,
  idColumn = 'id',
  userIdColumn = 'user_id',
  field,
  isArray = false,
  bucketGuess = 'product-images',
  subfolder,
}) {
  console.log(`\n>> Processing ${table}.${field} (array=${isArray})`);
  const selectCols = [idColumn, userIdColumn, field].join(',');
  let q = supabase
    .from(table)
    .select(selectCols)
    .limit(LIMIT || 10000);
  const res = await q;
  if (res.error) {
    console.error('Query error', res.error);
    return;
  }
  const rows = res.data || [];
  console.log(`Found ${rows.length} rows in ${table}`);
  let counter = 0;
  for (const row of rows) {
    const id = row[idColumn];
    const userId = row[userIdColumn] || (table === 'profiles' ? id : null);
    if (!userId) {
      console.log(`Skip ${table} ${id}: no user id`);
      continue;
    }
    let value = row[field];
    if (!value) continue;
    try {
      if (isArray && Array.isArray(value)) {
        const newArr = [];
        for (const item of value) {
          if (!item) continue;
          // skip if already in public/<userId>/
          if (typeof item === 'string' && item.includes(`/public/${userId}/`)) {
            newArr.push(item);
            continue;
          }
          const buf = await getBufferFromValue(item);
          if (!buf) {
            console.warn(`Could not download ${item} for ${table}.${id}`);
            newArr.push(item);
            continue;
          }
          const ext = extractExtFromFilename(item || 'img.jpg');
          const filePath = `${subfolder || table}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          if (!DRY) {
            const up = await uploadBufferToBucket(
              bucketGuess,
              `public/${filePath}`,
              buf,
              {}
            );
            newArr.push(up.publicUrl);
            console.log(`Uploaded -> ${up.publicUrl}`);
            await sleep(200);
          } else {
            newArr.push(`DRY_PUBLIC_URL://${filePath}`);
          }
        }
        if (!DRY) {
          const { error } = await supabase
            .from(table)
            .update({ [field]: newArr })
            .eq(idColumn, id);
          if (error) console.error('Update error', error);
        } else {
          console.log(
            `[DRY] Would update ${table}.${field} for id ${id} -> ${JSON.stringify(newArr)}`
          );
        }
      } else if (!isArray && typeof value === 'string') {
        if (value.includes(`/public/${userId}/`)) {
          continue;
        }
        const buf = await getBufferFromValue(value);
        if (!buf) {
          console.warn(`Could not download ${value} for ${table}.${id}`);
          continue;
        }
        const ext = extractExtFromFilename(value || 'img.jpg');
        const filePath = `${subfolder || table}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        if (!DRY) {
          const up = await uploadBufferToBucket(
            bucketGuess,
            `public/${filePath}`,
            buf,
            {}
          );
          // decide whether to update image_path (path) or image_url (public url)
          const updates = {};
          if (field.endsWith('_path')) updates[field] = up.path;
          else updates[field] = up.publicUrl;
          const { error } = await supabase
            .from(table)
            .update(updates)
            .eq(idColumn, id);
          if (error) console.error('Update error', error);
          console.log(
            `Updated ${table}.${field} id=${id} -> ${updates[field]}`
          );
          await sleep(200);
        } else {
          console.log(
            `[DRY] Would upload ${value} -> public/${filePath} and update ${table}.${field} for id ${id}`
          );
        }
      }
    } catch (err) {
      console.error(
        'Row migration error',
        table,
        id,
        err instanceof Error ? err.message : err
      );
    }
    counter++;
    if (LIMIT && counter >= LIMIT) break;
  }
}

(async function main() {
  console.log('Starting migration script. DRY=', DRY, 'LIMIT=', LIMIT);

  // Migrate profiles.avatar_url -> avatars bucket
  await migrateTableField({
    table: 'profiles',
    idColumn: 'id',
    userIdColumn: 'id',
    field: 'avatar_url',
    isArray: false,
    bucketGuess: 'avatars',
    subfolder: 'avatars',
  });

  // Migrate brands.logo_url -> product-images
  await migrateTableField({
    table: 'brands',
    idColumn: 'id',
    userIdColumn: 'user_id',
    field: 'logo_url',
    isArray: false,
    bucketGuess: 'product-images',
    subfolder: 'brands',
  });

  // Migrate categories.image_url -> product-images
  await migrateTableField({
    table: 'categories',
    idColumn: 'id',
    userIdColumn: 'user_id',
    field: 'image_url',
    isArray: false,
    bucketGuess: 'product-images',
    subfolder: 'categories',
  });

  // Migrate products.image_url and products.image_path and products.images (array)
  await migrateTableField({
    table: 'products',
    idColumn: 'id',
    userIdColumn: 'user_id',
    field: 'image_url',
    isArray: false,
    bucketGuess: 'product-images',
    subfolder: 'products',
  });
  await migrateTableField({
    table: 'products',
    idColumn: 'id',
    userIdColumn: 'user_id',
    field: 'image_path',
    isArray: false,
    bucketGuess: 'product-images',
    subfolder: 'products',
  });
  await migrateTableField({
    table: 'products',
    idColumn: 'id',
    userIdColumn: 'user_id',
    field: 'images',
    isArray: true,
    bucketGuess: 'product-images',
    subfolder: 'products',
  });

  // Migrate settings.logo_url and settings.banners (array)
  await migrateTableField({
    table: 'settings',
    idColumn: 'id',
    userIdColumn: 'user_id',
    field: 'logo_url',
    isArray: false,
    bucketGuess: 'product-images',
    subfolder: 'branding',
  });
  await migrateTableField({
    table: 'settings',
    idColumn: 'id',
    userIdColumn: 'user_id',
    field: 'banners',
    isArray: true,
    bucketGuess: 'product-images',
    subfolder: 'banners',
  });

  console.log('Migration finished.');
})();
