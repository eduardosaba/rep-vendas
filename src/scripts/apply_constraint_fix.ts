import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('--- EXECUTANDO CORREÇÃO DE CONSTRAINTS NO SUPABASE ---');

  try {
    const res = await adminClient.rpc('exec_sql' as any, {
      sql_query: `
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_operational_status_enum;
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_commercial_status_enum;
      `
    });

    if (res.error) {
      console.log('Aviso: RPC exec_sql não disponível diretamente (', res.error.message, ').');
    } else {
      console.log('✅ Constraints antigas removidas com sucesso via SQL!');
    }
  } catch (err: any) {
    console.log('Aviso:', err?.message || 'RPC indisponível');
  }
}

run();
