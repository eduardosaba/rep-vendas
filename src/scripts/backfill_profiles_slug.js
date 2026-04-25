/*
  Script: backfill_profiles_slug.js
  Uso: export SUPABASE_URL=...; export SUPABASE_SERVICE_ROLE_KEY=...; node src/scripts/backfill_profiles_slug.js

  Este script:
  - Lê linhas de `settings` com `catalog_slug` não nulo
  - Para cada linha tenta atualizar `profiles.slug` quando:
    * o profile existe e `profiles.slug` está vazio
    * nenhum outro profile já usa o mesmo slug
  - Gera um relatório JSON/CSV em `reports/backfill_profiles_slug_report.json`

  AVISO: execute em ambiente seguro com a service role.
*/

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. Aborting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  const report = {
    scanned: 0,
    updated: [],
    skipped_conflict: [],
    missing_profile: [],
    errors: [],
  };

  try {
    const { data: settingsRows, error } = await supabase
      .from('settings')
      .select('user_id, catalog_slug')
      .neq('catalog_slug', null);

    if (error) throw error;
    if (!settingsRows || settingsRows.length === 0) {
      console.log('No settings rows with catalog_slug found.');
      return;
    }

    report.scanned = settingsRows.length;

    for (const row of settingsRows) {
      const userId = row.user_id;
      const slug = row.catalog_slug && String(row.catalog_slug).trim();
      if (!slug) continue;

      try {
        // load profile by id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, slug')
          .eq('id', userId)
          .maybeSingle();

        if (!profile) {
          report.missing_profile.push({ user_id: userId, catalog_slug: slug });
          console.log(`No profile found for user_id=${userId}`);
          continue;
        }

        if (profile.slug && String(profile.slug).trim() !== '') {
          // already has slug — skip
          console.log(`Profile ${userId} already has slug=${profile.slug}, skipping.`);
          continue;
        }

        // check conflict
        const { data: conflict } = await supabase
          .from('profiles')
          .select('id')
          .eq('slug', slug)
          .neq('id', userId)
          .limit(1);

        if (conflict && conflict.length > 0) {
          report.skipped_conflict.push({ user_id: userId, catalog_slug: slug, conflicting_profile_id: conflict[0].id });
          console.log(`Conflict: slug='${slug}' already used by profile ${conflict[0].id}; skipping user ${userId}.`);
          continue;
        }

        // perform update
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ slug, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateErr) {
          report.errors.push({ user_id: userId, catalog_slug: slug, error: updateErr.message });
          console.error(`Failed to update profile ${userId}: ${updateErr.message}`);
          continue;
        }

        report.updated.push({ user_id: userId, catalog_slug: slug });
        console.log(`Updated profile ${userId} slug='${slug}'`);
      } catch (e) {
        report.errors.push({ user_id: row.user_id, catalog_slug: row.catalog_slug, error: String(e) });
        console.error('Error processing row', row, e);
      }
    }
  } catch (e) {
    console.error('Fatal error during backfill:', e);
    process.exitCode = 2;
  }

  // write report
  const reportsDir = path.join(process.cwd(), 'reports');
  try {
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    const outPath = path.join(reportsDir, 'backfill_profiles_slug_report.json');
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log('Report written to', outPath);
  } catch (e) {
    console.error('Failed to write report:', e);
  }
}

run();
