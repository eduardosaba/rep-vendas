import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carrega variváveis de ambiente locais
function loadEnv(file = '.env.local') {
  const p = path.resolve(process.cwd(), file);
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    content.split('\n').forEach((line) => {
      const [key, ...REST] = line.split('=');
      if (key && REST) {
        const val = REST.join('=')
          .trim()
          .replace(/^['"]|['"]$/g, '');
        process.env[key.trim()] = val;
      }
    });
  }
}
loadEnv();

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA || !KEY) {
  console.error('Erro: Variáveis de ambiente faltando.');
  process.exit(1);
}

const supabase = createClient(SUPA, KEY);

async function run() {
  console.log('Diagnóstico de sincronização...');

  // 1. Falsos Positivos
  console.log("\n1. Verificando 'synced' apontando para Safilo:");
  const { data: falsos, error: err1 } = await supabase
    .from('products')
    .select('id, name, sync_status, image_url')
    .eq('sync_status', 'synced')
    .ilike('image_url', '%safilo%')
    .limit(10);

  if (err1) console.error('Erro query 1:', err1.message);
  else {
    console.table(falsos);
    if ((falsos?.length || 0) > 0) {
      console.log(
        '⚠️ ATENÇÃO: Encontrados itens marcados como SYNCED mas com URL externa.'
      );
    }
  }

  // 2. Erros Ocultos
  console.log('\n2. Agrupamento de erros:');
  // Como não temos GROUP BY fácil via cliente JS direto sem RPC, faremos uma query simples de errors
  const { data: errors, error: err2 } = await supabase
    .from('products')
    .select('sync_error')
    .or(
      'sync_status.eq.failed,and(sync_status.eq.pending,sync_error.not.is.null)'
    )
    .limit(100);

  if (err2) console.error('Erro query 2:', err2.message);
  else {
    const counts = {};
    errors?.forEach((e) => {
      const msg = e.sync_error || '(sem mensagem)';
      counts[msg] = (counts[msg] || 0) + 1;
    });
    console.table(counts);
  }
}

run();
