import dotenv from 'dotenv';
// Carrega .env.local primeiro (Next usa .env.local), cai para .env se não existir
dotenv.config({ path: '.env.local' });
dotenv.config();
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente (ou .env.local)'
  );
  console.error('Valores detectados:', {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Parse CLI flags
const argv = process.argv.slice(2);
const CLEANUP = argv.includes('--cleanup') || argv.includes('-c');
let COUNT = 5;
let USE_PRODUCTS = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--count' || a === '-n') {
    const v = Number(argv[i + 1]);
    if (!Number.isNaN(v) && v > 0) COUNT = Math.min(200, Math.max(1, v));
  }
  if (a === '--use-products' || a === '-p') USE_PRODUCTS = true;
}

async function confirmCleanup() {
  if (!CLEANUP) return false;
  if (!stdin.isTTY) return true; // non-interactive: assume yes
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
  const jobId = crypto.randomUUID();
  console.log('Criando job de teste:', jobId);

  // Tenta criar um job com os campos mínimos; alguns schemas podem não expor
  // `created_at/updated_at` através do cliente PostgREST, por isso evitamos
  // inseri-los diretamente aqui.
  const { error: insertErr } = await supabase.from('sync_jobs').insert({
    id: jobId,
    user_id: null,
    total_count: 5,
    processed: 0,
    succeeded: 0,
    failed: 0,
    status: 'processing',
  });

  if (insertErr) {
    console.error('Erro ao criar sync_jobs de teste:', insertErr);
    // Se o erro for devido ao cache de schema do PostgREST (PGRST204), seguimos
    // e deixamos que a RPC faça o upsert. Se for violação NOT NULL em `user_id`
    // (23502), tentamos buscar um `profile` existente e recriar o job com um
    // `user_id` válido.
    if (insertErr.code === 'PGRST204') {
      console.warn(
        'PostgREST schema cache inconsistente; pulando criação explícita do job.'
      );
    } else if (insertErr.code === '23502') {
      console.warn(
        'user_id é NOT NULL; tentando localizar um profile existente para usar...'
      );
      try {
        const { data: profileRow, error: profErr } = await supabase
          .from('profiles')
          .select('id')
          .limit(1)
          .maybeSingle();
        if (profErr || !profileRow) {
          console.error(
            'Não foi possível localizar um profile para atribuir ao job de teste.',
            profErr
          );
        } else {
          console.log(
            'Usando profile',
            profileRow.id,
            'para recriar sync_jobs.'
          );
          const { error: retryErr } = await supabase.from('sync_jobs').insert({
            id: jobId,
            user_id: profileRow.id,
            total_count: 5,
            processed: 0,
            succeeded: 0,
            failed: 0,
            status: 'processing',
          });
          if (retryErr) {
            console.error('Falha ao recriar sync_jobs com user_id:', retryErr);
            process.exit(1);
          } else {
            console.log('Job de teste criado com sucesso usando profile.');
          }
        }
      } catch (e) {
        console.error('Erro ao buscar profile para uso no job de teste:', e);
      }
    } else {
      process.exit(1);
    }
  }

  // Optionally reuse real products from the DB
  let productIds = [];
  if (USE_PRODUCTS) {
    try {
      const { data: prods, error: prodErr } = await supabase
        .from('products')
        .select('id')
        .limit(COUNT);
      if (!prodErr && Array.isArray(prods) && prods.length > 0) {
        productIds = prods.map((p) => p.id);
        console.log(`Usando ${productIds.length} produtos reais para o teste.`);
      } else {
        console.warn(
          'Não foi possível carregar produtos reais, usando UUIDs aleatórios.'
        );
      }
    } catch (e) {
      console.warn(
        'Erro ao buscar produtos reais, usando UUIDs aleatórios.',
        e
      );
    }
  }

  for (let i = 0; i < COUNT; i++) {
    const productId = productIds[i] || crypto.randomUUID();
    const status = i === 2 ? 'failed' : 'success';
    const error_text = status === 'failed' ? 'Simulated download error' : null;

    console.log(
      `Chamando RPC (${i + 1}/5): status=${status} product=${productId}`
    );
    const { data, error } = await supabase.rpc('increment_sync_progress', {
      p_job_id: jobId,
      p_status: status,
      p_product_id: productId,
      p_error_text: error_text,
    });

    if (error) {
      console.error('RPC retornou erro:', error);
    } else {
      console.log('RPC executada com sucesso');
    }

    // pequeno delay para observabilidade
    await new Promise((r) => setTimeout(r, 300));
  }

  const { data: jobRow, error: jobErr } = await supabase
    .from('sync_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  if (jobErr) console.error('Erro ao buscar job:', jobErr);
  else console.log('Estado do job:', jobRow);

  const { data: items, error: itemsErr } = await supabase
    .from('sync_job_items')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (itemsErr) console.error('Erro ao buscar items:', itemsErr);
  else console.log('Últimos items:', items);

  console.log('Teste concluído.');
  if (CLEANUP) {
    const doCleanup = await confirmCleanup();
    if (doCleanup) {
      console.log('Cleanup ativo: removendo registros de teste...');
      try {
        const { data: itemsBefore, error: itemsErr } = await supabase
          .from('sync_job_items')
          .select('id,product_id')
          .eq('job_id', jobId);
        if (itemsErr)
          console.warn(
            'Falha ao listar sync_job_items antes do delete:',
            itemsErr
          );
        else
          console.log(
            'IDs de items a remover:',
            (itemsBefore || []).map((it) => it.id)
          );

        const { data: jobBefore, error: jobBeforeErr } = await supabase
          .from('sync_jobs')
          .select('id')
          .eq('id', jobId)
          .maybeSingle();
        if (jobBeforeErr)
          console.warn(
            'Falha ao buscar sync_job antes do delete:',
            jobBeforeErr
          );
        else if (jobBefore) console.log('Job a remover:', jobBefore.id);

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

main().catch((err) => {
  console.error('Erro no script:', err);
  process.exit(1);
});
