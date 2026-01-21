import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import https from 'https';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

function loadEnv(file = '.env.local') {
  const p = path.resolve(process.cwd(), file);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    content.split('\n').forEach((line) => {
      const [key, ...REST] = line.split('=');
      if (key && REST)
        process.env[key.trim()] = REST.join('=')
          .trim()
          .replace(/^['\"]|[\'\"]$/g, '');
    });
  }
}
loadEnv();

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
let userId = null;
let limit = 30;
let concurrency = 2;
let dryRun = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--user' || argv[i] === '-u') userId = argv[i + 1];
  if (argv[i] === '--limit' || argv[i] === '-n')
    limit = Number(argv[i + 1]) || limit;
  if (argv[i] === '--concurrency' || argv[i] === '-c')
    concurrency = Number(argv[i + 1]) || concurrency;
  if (argv[i] === '--dry-run') dryRun = true;
}

if (!userId) {
  console.error(
    'Usage: node scripts/internalize-pending.mjs --user <USER_ID> [--limit N] [--concurrency C] [--dry-run]'
  );
  process.exit(1);
}

const supabase = createClient(SUPA, KEY, { auth: { persistSession: false } });

async function fetchPending() {
  const { data, error } = await supabase
    .from('products')
    .select('id, sku, name, external_image_url, image_url')
    .eq('user_id', userId)
    .is('image_path', null)
    .or('external_image_url.not.is.null,image_url.not.is.null')
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function processOne(p) {
  const extUrl = p.external_image_url || p.image_url;
  if (!extUrl) return { id: p.id, ok: false, error: 'no url' };

  if (dryRun) return { id: p.id, ok: true, dry: true, url: extUrl };

  try {
    const opt = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Referer: 'https://commportal.safilo.com/',
      },
    };
    // Allow TLS bypass only for safilo host (temporary and targeted)
    try {
      const host = new URL(extUrl).hostname || '';
      if (host.includes('safilo')) {
        opt.agent = new https.Agent({ rejectUnauthorized: false });
      }
    } catch (e) {
      // ignore URL parse errors
    }
    const res = await fetch(extUrl, opt);
    if (!res.ok) return { id: p.id, ok: false, error: `http ${res.status}` };
    const buffer = Buffer.from(await res.arrayBuffer());
    const optimized = await sharp(buffer).resize(1200).jpeg().toBuffer();
    const fileName = `public/${userId}/products/${p.id}.jpg`;
    const { error: upErr } = await supabase.storage
      .from('product-images')
      .upload(fileName, optimized, { upsert: true });
    if (upErr)
      return { id: p.id, ok: false, error: String(upErr.message || upErr) };
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    const publicUrl = (urlData || {}).publicUrl || '';
    const { error: updErr } = await supabase
      .from('products')
      .update({ image_path: fileName, image_url: publicUrl })
      .eq('id', p.id);
    if (updErr)
      return { id: p.id, ok: false, error: String(updErr.message || updErr) };
    return { id: p.id, ok: true, path: fileName, publicUrl };
  } catch (err) {
    return { id: p.id, ok: false, error: String(err.message || err) };
  }
}

async function run() {
  console.log('Buscando pendentes para user', userId);
  const list = await fetchPending();
  console.log(`Encontrados ${list.length} items (limit ${limit})`);
  if (list.length === 0) return;

  const results = [];
  const queue = [...list];

  const workers = Array(concurrency)
    .fill(0)
    .map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (!item) break;
        process.stdout.write('.');
        const r = await processOne(item);
        results.push(r);
      }
    });

  await Promise.all(workers);
  console.log('\nResultados:');
  console.log(JSON.stringify(results, null, 2));
}

run().catch((e) => {
  console.error('Erro:', e.message || e);
  process.exit(1);
});
