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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const argv = process.argv.slice(2);
const opts = {
  bucket: 'product-images',
  prefix: null,
  legacyBucket: 'products',
  yes: false,
  dryRun: true,
};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--bucket' || a === '-b') opts.bucket = argv[i + 1] || opts.bucket;
  if (a === '--prefix' || a === '-p') opts.prefix = argv[i + 1];
  if (a === '--yes' || a === '-y') opts.yes = true;
  if (a === '--no-dry' || a === '--execute') opts.dryRun = false;
  if (a === '--legacy-bucket')
    opts.legacyBucket = argv[i + 1] || opts.legacyBucket;
}

if (!opts.prefix) {
  console.error(
    '❌ Obrigatório: informar --prefix <userId/...> para evitar remoção ampla.'
  );
  process.exit(1);
}

async function listAll(bucket, prefix) {
  const collected = [];
  const LIMIT = 100;
  let offset = 0;
  while (true) {
    // Supabase Storage list: list(path, { limit, offset })
    const res = await supabase.storage
      .from(bucket)
      .list(prefix, { limit: LIMIT, offset });
    if (res.error) throw res.error;
    const items = res.data || [];
    if (items.length === 0) break;
    // items have `name` when listing a prefix; full path = prefix + '/' + name
    for (const it of items) {
      const fullPath = prefix
        ? `${prefix.replace(/^\/+|\/+$/g, '')}/${it.name}`
        : it.name;
      collected.push(fullPath);
    }
    if (items.length < LIMIT) break;
    offset += items.length;
  }
  return collected;
}

async function removeBatch(bucket, paths) {
  if (!paths || paths.length === 0) return { success: true, removed: 0 };
  const BATCH = 100;
  let removed = 0;
  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) return { success: false, error };
    removed += batch.length;
  }
  return { success: true, removed };
}

(async () => {
  try {
    console.log(`Bucket: ${opts.bucket}`);
    console.log(`Prefix: ${opts.prefix}`);
    console.log(`Dry run: ${opts.dryRun}`);

    const paths = await listAll(opts.bucket, opts.prefix.replace(/^\/+/, ''));
    console.log(
      `Encontrei ${paths.length} arquivos no bucket '${opts.bucket}' com o prefixo '${opts.prefix}'.`
    );
    if (paths.length > 0) console.log('Amostra:', paths.slice(0, 10));

    // Também verifica bucket legacy (opcional)
    const legacyPaths = await listAll(
      opts.legacyBucket,
      opts.prefix.replace(/^\/+/, '')
    );
    if (legacyPaths.length > 0)
      console.log(
        `Encontrados ${legacyPaths.length} em bucket legacy '${opts.legacyBucket}'.`
      );

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFile = path.resolve(
      process.cwd(),
      `logs/delete-storage-${timestamp}.json`
    );
    const report = {
      bucket: opts.bucket,
      prefix: opts.prefix,
      found: paths.length,
      legacyFound: legacyPaths.length,
      removed: 0,
      legacyRemoved: 0,
      dryRun: opts.dryRun,
      details: { samples: paths.slice(0, 20) },
    };

    if (opts.dryRun) {
      console.log('\nDry-run ativo. Nenhum arquivo será removido.');
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      fs.writeFileSync(logFile, JSON.stringify(report, null, 2));
      console.log(`Relatório gravado em ${logFile}`);
      return process.exit(0);
    }

    if (!opts.yes) {
      console.log('\nPara executar a remoção use --yes ou -y.');
      console.log('Comando exemplo:');
      console.log(
        '  node scripts/delete-storage-by-prefix.mjs --prefix <userId/products> --no-dry --yes'
      );
      process.exit(0);
    }

    console.log('\nExecutando remoção...');
    const res = await removeBatch(opts.bucket, paths);
    if (!res.success) {
      console.error(
        'Erro ao remover do bucket principal:',
        res.error.message || res.error
      );
      report.error = res.error;
    } else {
      report.removed = res.removed;
      console.log(`Removidos ${res.removed} arquivos do bucket ${opts.bucket}`);
    }

    if (legacyPaths.length > 0) {
      const res2 = await removeBatch(opts.legacyBucket, legacyPaths);
      if (!res2.success) {
        console.error(
          'Erro ao remover do bucket legacy:',
          res2.error.message || res2.error
        );
        report.legacyError = res2.error;
      } else {
        report.legacyRemoved = res2.removed;
        console.log(
          `Removidos ${res2.removed} arquivos do bucket ${opts.legacyBucket}`
        );
      }
    }

    fs.mkdirSync(path.dirname(logFile), { recursive: true });
    fs.writeFileSync(logFile, JSON.stringify(report, null, 2));
    console.log(`Relatório final gravado em ${logFile}`);
  } catch (err) {
    console.error('Erro inesperado:', err.message || err);
    process.exit(1);
  }
})();
