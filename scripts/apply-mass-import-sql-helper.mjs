import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY ausente.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  const files = [
    join(process.cwd(), 'supabase', 'migrations', '20260917180000_mass_import_sql_reference_helper.sql'),
    join(process.cwd(), 'supabase', 'migrations', '20260917183000_fix_product_update_rpc_batch_resilience.sql'),
  ];

  for (const filePath of files) {
    const sql = readFileSync(filePath, 'utf-8');
    console.log(`\n⚡ Aplicando ${filePath}...`);

    let { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      const res = await supabase.rpc('sql', { q: sql });
      error = res.error;
    }

    if (error) {
      console.warn(`⚠️ RPC direto falhou para ${filePath}. Por favor, copie e cole o SQL no Supabase SQL Editor.`);
    } else {
      console.log(`✅ Aplicado com sucesso: ${filePath}`);
    }
  }
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
});
