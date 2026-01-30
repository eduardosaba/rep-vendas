#!/usr/bin/env node
/**
 * scripts/delete-internalized-images.mjs
 *
 * Uso:
 *  node scripts/delete-internalized-images.mjs --dry-run --since=2026-01-22
 *  node scripts/delete-internalized-images.mjs --ids=uuid1,uuid2 --confirm
 *
 * O script faz:
 *  - Busca produtos que têm imagens internalizadas (image_path ou images[].path)
 *  - Lista os objetos no Storage que seriam removidos
 *  - (opcional) Remove os objetos do bucket e atualiza os registros do produto
 *
 * IMPORTANTE:
 *  - Configure as variáveis de ambiente `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` antes de rodar.
 *  - Sempre rode com `--dry-run` primeiro.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const argv = process.argv.slice(2);
const args = {};
for (const a of argv) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    args[k] = v === undefined ? true : v;
  }
}

const DRY_RUN = args['dry-run'] !== undefined || !args['confirm'];
const SINCE = args['since'] || null; // e.g. 2026-01-22
const IDS = args['ids'] ? args['ids'].split(',') : null;
const BRAND = args['brand'] || null; // e.g. "Tommy Hilfiger" (uses ilike match)
const LIMIT = args['limit'] ? Number(args['limit']) : 1000;
const BUCKET = args['bucket'] || 'product-images';

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA_URL || !SERVICE_ROLE) {
  console.error('Faltam variáveis de ambiente. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPA_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

function extractPathFromUrl(url) {
  try {
    const u = new URL(url);
    // Supabase public URL patterns usually contain '/storage/v1/object/public/<bucket>/'
    const idx = u.pathname.indexOf('/storage/v1/object/public/');
    if (idx !== -1) {
      return u.pathname.replace('/storage/v1/object/public/', '').replace(/^\/+/, '');
    }
    // Fallback: if url contains bucket name
    const parts = u.pathname.split('/').filter(Boolean);
    const bucketIndex = parts.indexOf(BUCKET);
    if (bucketIndex !== -1) {
      return parts.slice(bucketIndex + 1).join('/');
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function gatherProducts() {
  if (IDS && IDS.length > 0) {
    console.log(`Buscando produtos por ids (${IDS.length})`);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, image_path, image_url, images, external_image_url, updated_at')
      .in('id', IDS)
      .limit(LIMIT);
    if (error) throw error;
    return data || [];
  }

  let query = supabase
    .from('products')
    .select('id, name, image_path, image_url, images, external_image_url, updated_at')
    .neq('image_path', null)
    .limit(LIMIT);

  if (SINCE) {
    query = query.gte('updated_at', SINCE);
  }

  if (BRAND) {
    // Use ilike for flexible, case-insensitive partial matches
    query = query.ilike('brand', `%${BRAND}%`);
    console.log(`Filtrando por brand ilike %${BRAND}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

(async () => {
  try {
    const products = await gatherProducts();
    console.log(`Encontrados ${products.length} produtos candidatos`);

    const tasks = [];
    for (const p of products) {
      const pathsToDelete = new Set();

      if (p.image_path) {
        const clean = String(p.image_path).replace(/^\/+/, '');
        pathsToDelete.add(clean);
      }

      // images pode ser array de strings ou array de objetos {url, path}
      if (Array.isArray(p.images)) {
        for (const it of p.images) {
          if (!it) continue;
          if (typeof it === 'string') {
            // pode ser URL pública ou path relativo
            if (it.startsWith('http')) {
              const ex = extractPathFromUrl(it);
              if (ex) pathsToDelete.add(ex);
            } else {
              pathsToDelete.add(String(it).replace(/^\/+/, ''));
            }
          } else if (typeof it === 'object') {
            if (it.path) pathsToDelete.add(String(it.path).replace(/^\/+/, ''));
            else if (it.url) {
              const ex = extractPathFromUrl(it.url);
              if (ex) pathsToDelete.add(ex);
            }
          }
        }
      }

      // also try to derive from image_url/external_image_url
      if (p.image_url && typeof p.image_url === 'string' && p.image_url.startsWith('http')) {
        const ex = extractPathFromUrl(p.image_url);
        if (ex) pathsToDelete.add(ex);
      }

      if (pathsToDelete.size === 0) continue;

      tasks.push({ product: p, paths: Array.from(pathsToDelete) });
    }

    console.log(`Total com objetos a checar: ${tasks.length}`);

    const report = [];

    for (const t of tasks) {
      const { product, paths } = t;
      // Check existence
      const existence = [];
      for (const pth of paths) {
        try {
          const { data: meta, error: mErr } = await supabase.storage
            .from(BUCKET)
            .list(path.dirname(pth) === '.' ? '' : path.dirname(pth), { limit: 1000 });
          // list returns files in folder; we check by name
          const name = path.basename(pth);
          const found = (meta || []).some((f) => f.name === name);
          existence.push({ path: pth, exists: found });
        } catch (err) {
          existence.push({ path: pth, exists: 'error', error: String(err) });
        }
      }

      report.push({ id: product.id, name: product.name, updated_at: product.updated_at, existence, paths });
    }

    const outPath = path.resolve(process.cwd(), 'tmp', `delete-image-report-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify({ generated_at: new Date().toISOString(), dryRun: DRY_RUN, report }, null, 2));

    console.log(`Relatório escrito em ${outPath}`);

    if (DRY_RUN) {
      console.log('Dry-run ativado — nada será removido. Para executar, re-run com --confirm');
      process.exit(0);
    }

    // Execute deletions
    const successes = [];
    const failures = [];

    for (const t of report) {
      const toDelete = t.paths.filter((p) => t.existence.some((e) => e.path === p && e.exists === true));
      if (toDelete.length === 0) continue;

      console.log(`Removendo ${toDelete.length} objetos para produto ${t.id} - ${t.name}`);
      try {
        const { data: delRes, error: delErr } = await supabase.storage.from(BUCKET).remove(toDelete);
        if (delErr) {
          console.error('Erro ao remover do storage', delErr);
          failures.push({ id: t.id, error: delErr, paths: toDelete });
        } else {
          // Atualiza banco: remover image_path e limpar imagens que tinham path
          // Carrega produto atual para processar images
          const { data: prod, error: prodErr } = await supabase
            .from('products')
            .select('images')
            .eq('id', t.id)
            .single();

          if (prodErr) {
            failures.push({ id: t.id, error: prodErr, paths: toDelete });
          } else {
            let newImages = prod.images;
            if (Array.isArray(newImages)) {
              newImages = newImages.filter((it) => {
                if (!it) return true;
                if (typeof it === 'string') return !toDelete.includes(String(it).replace(/^\/+/, ''));
                if (typeof it === 'object') return !toDelete.includes(String(it.path || '').replace(/^\/+/, ''));
                return true;
              });
            }

            const updates: any = {
              image_path: null,
              image_url: null,
              images: newImages,
            };

            const { error: updErr } = await supabase.from('products').update(updates).eq('id', t.id);
            if (updErr) {
              failures.push({ id: t.id, error: updErr, paths: toDelete });
            } else {
              successes.push({ id: t.id, deleted: toDelete });
            }
          }
        }
      } catch (err) {
        failures.push({ id: t.id, error: String(err), paths: toDelete });
      }
    }

    const finalOut = path.resolve(process.cwd(), 'tmp', `delete-image-result-${Date.now()}.json`);
    fs.writeFileSync(finalOut, JSON.stringify({ generated_at: new Date().toISOString(), successes, failures }, null, 2));
    console.log('Execução finalizada. Resultados em', finalOut);
  } catch (err) {
    console.error('Erro fatal:', err);
    process.exit(1);
  }
})();
