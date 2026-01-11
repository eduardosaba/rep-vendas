import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const argv = process.argv.slice(2);
let userId = null;
let COUNT = 30;
let APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
let CLEANUP = argv.includes('--cleanup') || argv.includes('-c');
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--user-id' || a === '-u') userId = argv[i + 1];
  if (a === '--count' || a === '-n') COUNT = Number(argv[i + 1]) || COUNT;
  if (a === '--app-url') APP_URL = argv[i + 1] || APP_URL;
}

if (!userId) {
  console.error(
    'Usage: node scripts/trigger-real-sync.mjs --user-id <USER_ID> [--count N] [--app-url URL] [--cleanup]'
  );
  process.exit(1);
}

if (
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY
) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.'
  );
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function confirmCleanup() {
  if (!CLEANUP) return false;
  if (!stdin.isTTY) return true;
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const ans = await rl.question(
      'Confirmar cleanup dos registros de teste? (y/N): '
    );
    return /^y(es)?$/i.test(String(ans).trim());
  } finally {
    rl.close();
  }
}

async function main() {
  console.log('Buscando produtos pendentes para user:', userId);
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, external_image_url')
    .eq('user_id', userId)
    .is('image_path', null)
    .limit(COUNT);

  if (prodErr) {
    console.error('Erro ao listar produtos:', prodErr);
    process.exit(1);
  }

  const items = (products || []).slice(0, COUNT);
  if (items.length === 0) {
    console.log('Nenhum produto pendente encontrado para o usuário.');
    process.exit(0);
  }

  const jobId = crypto.randomUUID();
  console.log('Criando sync_job:', jobId, 'total', items.length);

  const { error: insertErr } = await supabase.from('sync_jobs').insert({
    id: jobId,
    user_id: userId,
    total_count: items.length,
    processed: 0,
    succeeded: 0,
    failed: 0,
    completed_count: 0,
    status: 'processing',
  });

  if (insertErr) {
    console.error('Erro ao criar sync_jobs:', insertErr);
    console.error(
      'Se o job já existir ou houver restrições, verifique o schema e privilégios.'
    );
  }

  let succeeded = 0;
  let failed = 0;

  for (const it of items) {
    const productId = it.id;
    const externalUrl = it.external_image_url || null;
    if (!externalUrl) {
      console.warn('Produto sem external_image_url, pulando:', productId);
      continue;
    }

    console.log('Processando produto', productId, 'url:', externalUrl);

    try {
      const res = await fetch(
        `${APP_URL.replace(/\/$/, '')}/api/process-external-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, externalUrl }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('process-external-image falhou:', json || res.status);
        failed++;
        await supabase.rpc('increment_sync_progress', {
          p_job_id: jobId,
          p_status: 'failed',
          p_product_id: productId,
          p_error_text: String(json?.error || json?.message || 'remote failed'),
        });
      } else {
        succeeded++;
        await supabase.rpc('increment_sync_progress', {
          p_job_id: jobId,
          p_status: 'success',
          p_product_id: productId,
          p_error_text: null,
        });
      }
    } catch (err) {
      console.error(
        'Erro ao chamar process-external-image:',
        err?.message || err
      );
      failed++;
      try {
        await supabase.rpc('increment_sync_progress', {
          p_job_id: jobId,
          p_status: 'failed',
          p_product_id: productId,
          p_error_text: String(err?.message || err),
        });
      } catch (rpcErr) {
        console.error('Falha ao reportar falha via RPC:', rpcErr);
      }
    }

    // throttle
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log('Resumo: succeeded=', succeeded, 'failed=', failed);

  const { data: jobRow, error: jobErr } = await supabase
    .from('sync_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();
  if (jobErr) console.warn('Erro ao buscar job:', jobErr);
  else console.log('Estado do job:', jobRow);

  // cleanup
  if (CLEANUP) {
    const doCleanup = await confirmCleanup();
    if (doCleanup) {
      console.log('Executando cleanup...');
      try {
        const { data: itemsBefore, error: itemsErr } = await supabase
          .from('sync_job_items')
          .select('id,product_id')
          .eq('job_id', jobId);
        if (!itemsErr)
          console.log(
            'IDs de items removidos:',
            (itemsBefore || []).map((it) => it.id)
          );
        const { error: delItemsErr } = await supabase
          .from('sync_job_items')
          .delete()
          .eq('job_id', jobId);
        if (delItemsErr)
          console.warn('Falha ao remover sync_job_items:', delItemsErr);
        const { error: delJobErr } = await supabase
          .from('sync_jobs')
          .delete()
          .eq('id', jobId);
        if (delJobErr) console.warn('Falha ao remover sync_jobs:', delJobErr);
        else console.log('Cleanup concluído.');
      } catch (e) {
        console.error('Erro durante cleanup:', e);
      }
    } else {
      console.log('Cleanup cancelado pelo usuário.');
    }
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('Erro fatal do script:', e);
  process.exit(1);
});
