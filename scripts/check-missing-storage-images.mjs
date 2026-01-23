import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in env'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { persistSession: false },
});

function buildStorageUrl(filePath) {
  const base = SUPABASE_URL.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/product-images/${encodeURIComponent(filePath)}`;
}

async function head(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch (err) {
    return false;
  }
}

async function run() {
  console.log('Querying products for image paths...');
  const { data, error } = await supabase
    .from('products')
    .select('id,name,image_path,image_url,external_image_url,sync_status')
    .limit(10000);

  if (error) {
    console.error('Supabase query failed', error);
    process.exit(2);
  }

  const report = [];

  for (const p of data || []) {
    const id = p.id;
    const name = p.name;
    // Prefer explicit image_path; fallback to parsing image_url if it points to storage
    let filePath = null;
    if (p.image_path) filePath = p.image_path;
    else if (
      p.image_url &&
      String(p.image_url).includes('/storage/v1/object/public/product-images/')
    ) {
      try {
        const u = new URL(p.image_url);
        const idx = u.pathname.indexOf(
          '/storage/v1/object/public/product-images/'
        );
        filePath = decodeURIComponent(
          u.pathname.slice(
            idx + '/storage/v1/object/public/product-images/'.length
          )
        );
      } catch (e) {
        // ignore
      }
    }

      if (!filePath) continue; // nothing to check

    const url = buildStorageUrl(filePath);
    const exists = await head(url);
    if (!exists) {
      report.push({
        id,
        name,
        filePath,
        url,
        sync_status: p.sync_status,
        external_image_url: p.external_image_url || null,
      });
    }
  }

  const outDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(
    outDir,
    `missing-storage-images-${new Date().toISOString().slice(0, 10)}.json`
  );
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(
    `Found ${report.length} missing images. Report written to ${outPath}`
  );
  }
}
  async function runAndMaybeFix() {
    await run();

    const args = process.argv.slice(2);
    const doFix = args.includes('--fix');

    if (!doFix) return;

    // Load the report we just wrote
    const files = fs.readdirSync(path.join(process.cwd(), 'reports'));
    const latest = files
      .filter((f) => f.startsWith('missing-storage-images-'))
      .sort()
      .pop();
    if (!latest) {
      console.log('No report file found to fix.');
      return;
    }

    const reportPath = path.join(process.cwd(), 'reports', latest);
    const content = fs.readFileSync(reportPath, 'utf8');
    const rows = JSON.parse(content);

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log('No missing images to fix.');
      return;
    }

    console.log(`--fix flag detected. Will attempt to update ${rows.length} product(s) to sync_status='pending' when external_image_url exists.`);

    for (const r of rows) {
      if (!r.external_image_url) {
        console.log(`[skip] product ${r.id} has no external_image_url`);
        continue;
      }

      try {
        const updates: any = { sync_status: 'pending' };
        if (!r.filePath) updates.image_url = r.external_image_url;

        const { data: updData, error: updErr } = await supabase
          .from('products')
          .update(updates)
          .eq('id', r.id)
          .select('id,sync_status');

        if (updErr) {
          console.error(`[error] failed updating product ${r.id}`, updErr.message || updErr);
        } else {
          console.log(`[updated] product ${r.id}`, updData?.[0] || 'ok');
        }
      } catch (e) {
        console.error(`[error] exception updating product ${r.id}`, e?.message || e);
      }
    }
  }

  runAndMaybeFix().catch((err) => {
    console.error(err);
    process.exit(3);
  });
run().catch((err) => {
  console.error(err);
  process.exit(3);
});
