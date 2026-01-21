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
          .replace(/^['\"]|['\"]$/g, '');
        process.env[key.trim()] = val;
      }
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const argv = process.argv.slice(2);
let importId = null;
let limit = 10000;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--import' || a === '-i') importId = argv[i + 1];
  if (a === '--limit' || a === '-n') limit = Number(argv[i + 1]) || limit;
}

if (!importId) {
  console.error(
    'Uso: node scripts/export-import-paths.mjs --import <IMPORT_ID> [--limit N]'
  );
  process.exit(1);
}

(async () => {
  try {
    console.log(
      `Buscando produtos do importId=${importId} (limit=${limit})...`
    );
    const { data: products, error } = await supabase
      .from('products')
      .select(
        'id, sku, name, image_path, images, image_url, external_image_url'
      )
      .eq('last_import_id', importId)
      .limit(limit);

    if (error) throw error;
    const paths = [];
    for (const p of products || []) {
      if (p.image_path && typeof p.image_path === 'string')
        paths.push({
          type: 'image_path',
          product_id: p.id,
          sku: p.sku,
          path: p.image_path,
        });
      // images can be array or stringified JSON
      if (p.images) {
        if (Array.isArray(p.images)) {
          for (const it of p.images) {
            if (it && typeof it === 'string' && !/^https?:\/\//i.test(it)) {
              paths.push({
                type: 'images_array',
                product_id: p.id,
                sku: p.sku,
                path: it,
              });
            }
          }
        } else if (typeof p.images === 'string') {
          try {
            if (p.images.trim().startsWith('[')) {
              const parsed = JSON.parse(p.images);
              if (Array.isArray(parsed)) {
                for (const it of parsed) {
                  if (
                    it &&
                    typeof it === 'string' &&
                    !/^https?:\/\//i.test(it)
                  ) {
                    paths.push({
                      type: 'images_array',
                      product_id: p.id,
                      sku: p.sku,
                      path: it,
                    });
                  }
                }
              }
            } else {
              // comma separated
              const parts = p.images
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
              for (const it of parts)
                if (!/^https?:\/\//i.test(it))
                  paths.push({
                    type: 'images_array',
                    product_id: p.id,
                    sku: p.sku,
                    path: it,
                  });
            }
          } catch (e) {
            // fallback split
            const parts = p.images
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean);
            for (const it of parts)
              if (!/^https?:\/\//i.test(it))
                paths.push({
                  type: 'images_array',
                  product_id: p.id,
                  sku: p.sku,
                  path: it,
                });
          }
        }
      }
    }

    const unique = [];
    const seen = new Set();
    for (const r of paths) {
      const key = `${r.type}::${r.path}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(r);
      }
    }

    const outDir = path.resolve(process.cwd(), 'logs');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `import-paths-${importId}.json`);
    fs.writeFileSync(
      outFile,
      JSON.stringify({ importId, count: unique.length, items: unique }, null, 2)
    );

    console.log(
      `Encontrados ${unique.length} paths. Exportados para ${outFile}`
    );
  } catch (err) {
    console.error('Erro:', err.message || err);
    process.exit(1);
  }
})();
