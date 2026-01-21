import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function loadEnv(file = '.env.local') {
  const p = path.resolve(process.cwd(), file);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    content.split('\n').forEach((line) => {
      const [key, ...REST] = line.split('=');
      if (key && REST) {
        const val = REST.join('=')
          .trim()
          .replace(/^['"]|['"]$/g, '');
        process.env[key.trim()] = val;
      }
    });
  }
}
loadEnv();

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
  );
  process.exit(1);
}

const supabase = createClient(SUPA, KEY, { auth: { persistSession: false } });

async function run() {
  try {
    console.log(
      '1) Contando produtos SEM `image_path` mas COM `external_image_url` ou `image_url`...'
    );
    const { count, error: cntErr } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('image_path', null)
      .or('external_image_url.not.is.null,image_url.not.is.null');

    if (cntErr) throw cntErr;
    console.log('Pendentes total:', count || 0);

    console.log('\n2) Amostras recentes (limit 10):');
    const { data: samples, error: sampErr } = await supabase
      .from('products')
      .select(
        'id, sku, name, user_id, last_import_id, external_image_url, image_url, image_path, created_at'
      )
      .is('image_path', null)
      .or('external_image_url.not.is.null,image_url.not.is.null')
      .order('created_at', { ascending: false })
      .limit(10);

    if (sampErr) throw sampErr;
    console.log(JSON.stringify(samples || [], null, 2));

    console.log('\n3) Últimos 10 `sync_jobs` criados:');
    const { data: jobs, error: jobsErr } = await supabase
      .from('sync_jobs')
      .select(
        'id, user_id, total_count, completed_count, status, created_at, updated_at'
      )
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsErr) throw jobsErr;
    console.log(JSON.stringify(jobs || [], null, 2));

    console.log(
      '\n4) Verificando `product_images` com status failed/pending (limit 10):'
    );
    const { data: imgs, error: imgsErr } = await supabase
      .from('product_images')
      .select('id, product_id, url, sync_status, sync_error, created_at')
      .in('sync_status', ['pending', 'failed'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (imgsErr) throw imgsErr;
    console.log(JSON.stringify(imgs || [], null, 2));

    return 0;
  } catch (err) {
    console.error('Erro durante diagnóstico:', err.message || err);
    return 2;
  }
}

run().then((code) => process.exit(code));
