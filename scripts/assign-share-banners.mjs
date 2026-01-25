#!/usr/bin/env node
/*
  scripts/assign-share-banners.mjs

  Usage:
    node scripts/assign-share-banners.mjs         # dry-run (preview)
    node scripts/assign-share-banners.mjs --apply # actually update rows

  Requirements:
    - set env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

  Behaviour:
    - Finds `public_catalogs` rows where `share_banner_url` is null/empty
    - For each, if the owner's products contain exactly ONE brand, attempts to
      fetch that brand's `logo_url` from `brands` and use it as `share_banner_url`.
    - Falls back to `settings.logo_url` only if brand logo missing.
    - Prints a preview of changes and only updates when run with `--apply`.
*/

import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE URL / SERVICE ROLE KEY. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.'
  );
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('\n== assign-share-banners: Iniciando (preview mode) ==\n');
  if (APPLY) console.log('Modo: APPLY (as alterações serão gravadas)');
  else console.log('Modo: PREVIEW (nenhuma alteração será gravada)');

  // Fetch all public_catalogs and filter those without share_banner_url
  const { data: catalogs, error: errFetch } = await supabase
    .from('public_catalogs')
    .select('id,user_id,store_name,share_banner_url')
    .order('id', { ascending: true });

  if (errFetch) {
    console.error('Erro ao buscar public_catalogs:', errFetch);
    process.exit(3);
  }

  const toProcess = (catalogs || []).filter((c) => !c.share_banner_url);
  console.log(
    `Encontrados ${toProcess.length} catálogos sem share_banner_url.`
  );

  const summary = {
    total: toProcess.length,
    willUpdate: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const cat of toProcess) {
    const { id, user_id: userId, store_name } = cat;
    try {
      // fetch product brands for this user
      const { data: prodBrands } = await supabase
        .from('products')
        .select('brand')
        .eq('user_id', userId)
        .not('brand', 'is', null);

      const brands = Array.from(
        new Set(
          (prodBrands || [])
            .map((p) => (p.brand || '').toString().trim())
            .filter(Boolean)
        )
      );

      if (brands.length !== 1) {
        console.log(
          `- [SKIP] ${store_name} (${id}): marcas encontradas = ${brands.length}`
        );
        summary.skipped++;
        continue;
      }

      const brandName = brands[0];
      // try brand logo
      const { data: brandRow } = await supabase
        .from('brands')
        .select('logo_url')
        .eq('user_id', userId)
        .eq('name', brandName)
        .maybeSingle();

      let candidate = brandRow?.logo_url || null;

      if (!candidate) {
        // fallback to settings.logo_url
        const { data: settingsRow } = await supabase
          .from('settings')
          .select('logo_url')
          .eq('user_id', userId)
          .maybeSingle();
        candidate = settingsRow?.logo_url || null;
      }

      if (!candidate) {
        console.log(
          `- [SKIP] ${store_name} (${id}): nenhuma logo encontrada para marca '${brandName}' nem settings.logo_url`
        );
        summary.skipped++;
        continue;
      }

      console.log(`- [OK] ${store_name} (${id}): atribuir ${candidate}`);
      summary.willUpdate++;

      if (APPLY) {
        const { error: upErr } = await supabase
          .from('public_catalogs')
          .update({ share_banner_url: candidate })
          .eq('id', id);
        if (upErr) {
          console.error(
            `  -> erro ao atualizar ${id}:`,
            upErr.message || upErr
          );
          summary.errors++;
        } else {
          summary.updated++;
        }
      }
    } catch (e) {
      console.error(
        `- [ERR] ${store_name} (${id}):`,
        e instanceof Error ? e.message : e
      );
      summary.errors++;
    }
  }

  console.log('\n== Resumo ==');
  console.log(`Total processado: ${summary.total}`);
  console.log(`Ações propostas: ${summary.willUpdate}`);
  if (APPLY)
    console.log(`Atualizadas: ${summary.updated} ; Erros: ${summary.errors}`);
  else
    console.log(
      'Nenhuma alteração gravada (modo preview). Execute com --apply para aplicar.'
    );

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('Fatal error:', e instanceof Error ? e.message : e);
  process.exit(99);
});
