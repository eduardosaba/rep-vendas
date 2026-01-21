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
        process.env[key.trim()] = REST.join('=')
          .trim()
          .replace(/^["']|["']$/g, '');
      }
    });
  }
}
loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  }
);

async function run() {
  console.log('--- 1. Buscando 5 produtos com IMAGE_URL = NULL ---');
  const { data: nulls, error: err1 } = await supabase
    .from('products')
    .select('id, sku, name, image_url, images')
    .is('image_url', null)
    .limit(5);

  if (err1) console.error(err1);
  else console.log(JSON.stringify(nulls, null, 2));

  console.log(
    '\n--- 2. Buscando 5 produtos com Capa = P13 ou P14 (Que deveriam ter sumido) ---'
  );
  const { data: p13s, error: err2 } = await supabase
    .from('products')
    .select('id, sku, image_url, images')
    .or('image_url.ilike.%p13.%,image_url.ilike.%p14.%')
    .limit(5);

  if (err2) console.error(err2);
  else console.log(JSON.stringify(p13s, null, 2));
}

run();
