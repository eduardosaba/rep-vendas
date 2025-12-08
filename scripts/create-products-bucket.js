// Cria o bucket 'products' no Supabase Storage usando Service Role Key.
// Uso:
//   - exportar variáveis de ambiente e executar:
//       $env:SUPABASE_SERVICE_ROLE_KEY = '...'; pnpm dev (ou apenas node scripts/create-products-bucket.js)
//   - ou passar como argumentos: node scripts/create-products-bucket.js <SUPABASE_URL> <SERVICE_ROLE_KEY>

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.argv[2];
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.argv[3];

if (!supabaseUrl || !serviceKey) {
  console.error('Uso: forneça NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY via env ou args');
  console.error('Ex: $env:SUPABASE_SERVICE_ROLE_KEY = "..."; node scripts/create-products-bucket.js');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const bucketName = 'products';

async function main() {
  try {
    console.log(`[create-bucket] Criando bucket '${bucketName}'...`);
    const { data, error } = await supabaseAdmin.storage.createBucket(bucketName, { public: false });

    if (error) {
      // Supabase retorna status/code quando o bucket já existe
      const msg = String(error?.message ?? error);
      if (error?.status === 409 || msg.toLowerCase().includes('already exists')) {
        console.log(`[create-bucket] O bucket '${bucketName}' já existe. Nada a fazer.`);
        process.exit(0);
      }
      console.error('[create-bucket] Erro ao criar bucket:', msg);
      process.exit(2);
    }

    console.log('[create-bucket] Bucket criado com sucesso:', data);
    process.exit(0);
  } catch (err) {
    console.error('[create-bucket] Exceção:', err);
    process.exit(3);
  }
}

main();
#!/usr/bin/env node
/**
 * Script para criar o bucket `products` no Supabase usando a Service Role Key.
 * Uso: set SUPABASE_SERVICE_ROLE_KEY=...; set NEXT_PUBLIC_SUPABASE_URL=...; node scripts/create-products-bucket.js
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Faltam variáveis de ambiente. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  global: { fetch: global.fetch },
});

async function main() {
  const bucket = 'products';
  try {
    console.log('Tentando criar bucket:', bucket);
    const res = await supabase.storage.createBucket(bucket, { public: true });
    if (res.error) {
      // statusCode 409 geralmente significa que o bucket já existe
      console.error('Resposta do Supabase:', res.error.message || res.error);
      if (
        res.status === 409 ||
        (res.error &&
          res.error.message &&
          String(res.error.message).toLowerCase().includes('already exists'))
      ) {
        console.log('Bucket já existe (ok).');
        process.exit(0);
      }
      process.exit(1);
    }
    console.log('Bucket criado com sucesso:', bucket);
    process.exit(0);
  } catch (err) {
    console.error('Erro inesperado:', err);
    process.exit(1);
  }
}

main();
