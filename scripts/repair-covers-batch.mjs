#!/usr/bin/env node
// Script batch para reparar capas em lotes usando Supabase Service Role.
// Uso: node scripts/repair-covers-batch.mjs --batch=1000 [--dry-run]

import { createClient } from '@supabase/supabase-js';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));
const BATCH = parseInt(argv.batch || argv.b || '1000', 10);
const DRY = !!argv['dry-run'] || !!argv.dry;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  if (!DRY) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. For dry-run you may skip providing keys with --dry-run.'
    );
    process.exit(1);
  }
}

const supabase = createClient(
  SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY || ''
);

async function fetchCandidates(limit) {
  // Busca um lote de produtos que precisam de repair
  const { data, error } = await supabase
    .from('products')
    .select('id, images, image_url')
    .or('image_url.is.null,image_url.not.ilike.%P00.jpg%')
    .limit(limit);

  if (error) throw error;
  return data || [];
}

function pickCandidate(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const lower = images.map((i) => (i || '').toLowerCase());
  const p00Index = lower.findIndex((i) => i.includes('p00.jpg'));
  if (p00Index >= 0) return images[p00Index];
  return images[0];
}

async function updateBatchWithSQL(updates) {
  // Gera um UPDATE CASE ... WHEN ... para atualizar em bloco
  const ids = updates.map((u) => `'${u.id.replace("'", "''")}'`).join(',');
  const cases = updates
    .map(
      (u) =>
        `WHEN '${u.id.replace("'", "''")}' THEN '${u.candidate.replace("'", "''")}'`
    )
    .join('\n      ');

  const query = `
    WITH updated AS (
      UPDATE products
      SET image_url = CASE id
        ${cases}
        ELSE image_url
      END
      WHERE id IN (${ids})
      RETURNING id
    ) SELECT count(*) AS updated FROM updated;
  `;

  const { data, error } = await supabase.rpc('execute_sql', { query });
  if (error) {
    return { error, data: null };
  }
  return { data };
}

async function updateBatchIndividually(updates) {
  const results = [];
  for (const u of updates) {
    const { error } = await supabase
      .from('products')
      .update({ image_url: u.candidate })
      .eq('id', u.id);
    results.push({ id: u.id, error });
  }
  return results;
}

(async function main() {
  console.log(`Starting repair-batch (batch=${BATCH}) dry-run=${DRY}`);

  let totalUpdated = 0;
  let round = 0;

  while (true) {
    round += 1;
    console.log(`\nFetching batch #${round}...`);
    const candidates = await fetchCandidates(BATCH);
    if (candidates.length === 0) {
      console.log('No more candidates found. Exiting.');
      break;
    }

    const updates = [];
    for (const row of candidates) {
      try {
        const candidate = pickCandidate(row.images || []);
        if (!candidate) continue;
        // Skip if already equals
        if (row.image_url && (row.image_url || '') === candidate) continue;
        updates.push({ id: row.id, candidate });
      } catch (e) {
        console.error('Failed to compute candidate for', row.id, e);
      }
    }

    if (updates.length === 0) {
      console.log(
        'No updates in this batch (images missing or already correct). Continuing.'
      );
      // If there were candidates but none valid, continue to next batch to avoid infinite loop
      continue;
    }

    console.log(`Prepared ${updates.length} updates.`);

    if (DRY) {
      console.table(updates.slice(0, 10));
      totalUpdated += updates.length; // for reporting purpose in dry-run
      // Continue to next batch for preview purposes until we exhaust selection
      continue;
    }

    // Try bulk update via execute_sql RPC first
    try {
      const { data, error } = await updateBatchWithSQL(updates);
      if (error) {
        console.warn(
          'Bulk SQL update via execute_sql failed, falling back to individual updates.',
          error.message || error
        );
        const indy = await updateBatchIndividually(updates);
        const failed = indy.filter((r) => r.error);
        const succeeded = indy.length - failed.length;
        totalUpdated += succeeded;
        console.log(
          `Updated ${succeeded} rows (individual). ${failed.length} failed.`
        );
      } else {
        // data may be like [{ updated: '10' }] depending on rpc implementation
        const count = (() => {
          try {
            if (Array.isArray(data) && data.length > 0 && data[0].updated)
              return parseInt(data[0].updated, 10) || 0;
            if (data && data.updated) return parseInt(data.updated, 10) || 0;
          } catch {}
          return updates.length;
        })();
        totalUpdated += count;
        console.log(`Bulk updated ${count} rows.`);
      }
    } catch (e) {
      console.error('Update failed for batch:', e);
    }

    // Small delay to avoid overwhelming the DB
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('\nFinished. Total (approx) updated:', totalUpdated);
  process.exit(0);
})();
