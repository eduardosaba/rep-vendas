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
  console.log('🛠️  EXECUTANDO DIAGNÓSTICO E CORREÇÃO DE IMAGENS SAFILO 🛠️\n');

  // 1. Diagnóstico da Coluna "Invisível"
  console.log("1. Amostra de 'pending' para verificar image_path:");
  const { data: sample, error: err1 } = await supabase
    .from('products')
    .select('id, name, image_url, image_path, sync_error')
    .eq('sync_status', 'pending')
    .limit(5);

  if (err1) console.error('Erro no diagnóstico:', err1.message);
  else console.table(sample || []);

  // 2. Correção de Colunas (external_image_url) - Preventivo
  console.log(
    "\n2. Sincronizando 'image_url' para 'external_image_url' se Safilo..."
  );
  const { count: countExt, error: errExt } = await supabase
    .from('products')
    .update({}) // hack para contar ou rodar update condicional, mas supabase-js precisa de dados. Faremos em duas etapas ou query direta.
    // Como não dá pra fazer UPDATE ... SET a = b direto facil aqui sem RPC,
    // vamos fazer um fetch e update em batch ou usar um RPC se existisse.
    // Vou iterar rápido para resolver.
    .select('*', { count: 'exact', head: true });

  // Melhor executar um SQL direto se possível, mas aqui via JS vamos iterar os nulls.
  // Buscando produtos Safilo sem external_image_url
  const { data: fixList } = await supabase
    .from('products')
    .select('id, image_url')
    .like('image_url', '%safilo%')
    .is('external_image_url', null)
    .limit(500); // Lote seguro

  if (fixList && fixList.length > 0) {
    console.log(
      `Encontrados ${fixList.length} itens sem external_image_url. Corrigindo...`
    );
    for (const item of fixList) {
      await supabase
        .from('products')
        .update({ external_image_url: item.image_url })
        .eq('id', item.id);
    }
    console.log('Correção de external_image_url concluída para este lote.');
  } else {
    console.log(
      'Nenhum item precisava de correção em external_image_url (lote 500).'
    );
  }

  // 3. O "Master Reset" (image_path = NULL)
  console.log(
    "\n3. Master Reset: Limpando 'image_path' e erros para forçar Inngest..."
  );
  const { error: errReset, count: countReset } = await supabase
    .from('products')
    .update({
      sync_status: 'pending',
      sync_error: null,
      image_path: null,
    })
    .like('image_url', '%safilo%')
    .select('id', { count: 'exact' });

  if (errReset) console.error('Erro no Master Reset:', errReset.message);
  else
    console.log(
      `Master Reset aplicado em ${countReset} registros. O Inngest agora deve enxergá-los.`
    );

  console.log(
    "\n✅ Concluído. Agora vá ao Dashboard e clique em 'Sincronizar Catálogo'."
  );
}

run();
