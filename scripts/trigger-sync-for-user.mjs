import fs from 'fs';
import path from 'path';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { inngest } from '../src/inngest/client.js';

function loadEnv(file = '.env.local') {
  const p = path.resolve(process.cwd(), file);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    content.split('\n').forEach((line) => {
      const [key, ...REST] = line.split('=');
      if (key && REST)
        process.env[key.trim()] = REST.join('=')
          .trim()
          .replace(/^['"]|['"]$/g, '');
    });
  }
}
loadEnv();

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPA || !KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
let userId = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--user' || argv[i] === '-u') userId = argv[i + 1];
}

if (!userId) {
  console.error(
    'Usage: node scripts/trigger-sync-for-user.mjs --user <USER_ID>'
  );
  process.exit(1);
}

async function run() {
  const supabase = createSupabaseClient(SUPA, KEY, {
    auth: { persistSession: false },
  });

  console.log('Criando registro em sync_jobs para user', userId);
  const { data: inserted, error: insertErr } = await supabase
    .from('sync_jobs')
    .insert({
      user_id: userId,
      status: 'processing',
      total_count: 0,
      completed_count: 0,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle();

  if (insertErr) {
    console.error('Erro ao criar sync_job:', insertErr);
    process.exit(1);
  }

  const jobId = inserted?.id || null;
  console.log('sync_job criado:', jobId);

  console.log('Enviando evento Inngest catalog/sync.requested (userId, jobId)');
  await inngest.send({
    name: 'catalog/sync.requested',
    data: { userId, jobId },
  });

  console.log(
    'Evento enviado. Se os workers estiverem ativos, a sincronização deverá começar em breve.'
  );
}

run().catch((err) => {
  console.error('Erro:', err.message || err);
  process.exit(1);
});
