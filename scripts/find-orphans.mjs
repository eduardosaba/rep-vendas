import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(file = '.env.local') {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return {};
  const content = fs.readFileSync(p, 'utf8');
  return content.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return acc;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return acc;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1);
    acc[key] = val;
    return acc;
  }, {});
}

(async () => {
  try {
    const env = loadEnv('.env.local');
    const SUPABASE_URL =
      env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY =
      env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local or environment.'
      );
      process.exit(2);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('📡 Listando referências no banco...');
    const { data: products } = await supabase
      .from('products')
      .select('id, image_path, image_url, images');

    const referenced = new Set();
    (products || []).forEach((p) => {
      if (p.image_path) referenced.add(String(p.image_path));
      if (p.image_url) {
        try {
          const u = new URL(p.image_url);
          const name = u.pathname.includes('product-images/')
            ? u.pathname.split('product-images/')[1]
            : u.pathname.replace(/^\//, '');
          referenced.add(name);
        } catch {
          // ignore
        }
      }
      if (p.images && Array.isArray(p.images)) {
        p.images.forEach((img) => {
          if (!img) return;
          const name = String(img).includes('product-images/')
            ? String(img).split('product-images/')[1]
            : String(img);
          referenced.add(name);
        });
      }
    });

    console.log(`Referências encontradas no DB: ${referenced.size}`);

    console.log(
      '📂 Listando arquivos no bucket `product-images` (recursivo)...'
    );

    async function listRecursive(prefix = '') {
      const { data, error } = await supabase.storage
        .from('product-images')
        .list(prefix, { limit: 1000 });
      if (error) throw error;
      let names = [];
      for (const item of data || []) {
        // Heurística: itens sem ponto provavelmente são pastas; tentamos descer
        if (!item.name.includes('.')) {
          const childPrefix = prefix ? `${prefix}/${item.name}` : item.name;
          const sub = await listRecursive(childPrefix);
          if (sub.length > 0) {
            names.push(...sub.map((n) => `${childPrefix}/${n}`));
          }
        } else {
          names.push(prefix ? `${prefix}/${item.name}` : item.name);
        }
      }
      return names;
    }

    const storageNames = await listRecursive('');
    console.log(`Arquivos no storage: ${storageNames.length}`);

    const orphans = storageNames.filter((n) => !referenced.has(n));

    console.log(`Orfãos detectados: ${orphans.length}`);
    if (orphans.length > 0) {
      console.log('--- Lista parcial de órfãos (até 200) ---');
      console.log(orphans.slice(0, 200).join('\n'));
    }

    process.exit(0);
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
})();
