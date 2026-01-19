import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function loadEnv(file = '.env.local') {
  const p = path.resolve(process.cwd(), file);
  if (!fs.existsSync(p)) return {};
  const content = fs.readFileSync(p, 'utf8');
  return content.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return acc;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return acc;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1);
    acc[key] = val;
    return acc;
  }, {});
}

(async () => {
  try {
    const env = loadEnv('.env.local');
    const SUPABASE_URL =
      env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY =
      env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local or environment.'
      );
      process.exit(2);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log('📡 Listando referências no banco...');
    const { data: products } = await supabase
      .from('products')
      .select('id, image_path, image_url, images');

    const referenced = new Set();
    (products || []).forEach((p) => {
      if (p.image_path) referenced.add(String(p.image_path));
      if (p.image_url) {
        try {
          const u = new URL(p.image_url);
          const name = u.pathname.includes('product-images/')
            ? u.pathname.split('product-images/')[1]
            : u.pathname.replace(/^\//, '');
          referenced.add(name);
        } catch {
          // ignore
        }
      }
      if (p.images && Array.isArray(p.images)) {
        p.images.forEach((img) => {
          if (!img) return;
          const name = String(img).includes('product-images/')
            ? String(img).split('product-images/')[1]
            : String(img);
          referenced.add(name);
        });
      }
    });

    console.log(`Referências encontradas no DB: ${referenced.size}`);

    console.log(
      '📂 Listando arquivos no bucket `product-images` (recursivo)...'
    );
    async function listRecursive(prefix = '') {
      const { data, error } = await supabase.storage
        .from('product-images')
        .list(prefix, { limit: 1000 });
      if (error) throw error;
      let names = [];
      for (const item of data || []) {
        if (!item.name.includes('.')) {
          const childPrefix = prefix ? `${prefix}/${item.name}` : item.name;
          const sub = await listRecursive(childPrefix);
          if (sub.length > 0)
            names.push(...sub.map((n) => `${childPrefix}/${n}`));
        } else {
          names.push(prefix ? `${prefix}/${item.name}` : item.name);
        }
      }
      return names;
    }

    const storageNames = await listRecursive('');
    console.log(`Arquivos no storage: ${storageNames.length}`);

    const orphans = storageNames.filter((n) => !referenced.has(n));
    console.log(`Orfãos detectados: ${orphans.length}`);
    if (orphans.length === 0) {
      console.log('Nada a remover. Saindo.');
      process.exit(0);
    }

    // Salvar lista completa de órfãos antes de remover (audit trail)
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const logPath = path.join(
      process.cwd(),
      'scripts',
      `removed-orphans-${ts}.json`
    );
    fs.writeFileSync(
      logPath,
      JSON.stringify(
        { timestamp: new Date().toISOString(), count: orphans.length, orphans },
        null,
        2
      )
    );
    console.log(`Lista de órfãos salva em: ${logPath}`);

    // Mostrar uma amostra
    console.log('Amostra de órfãos (até 50):');
    console.log(orphans.slice(0, 50).join('\n'));

    // Remover em lotes de 200 e registrar erros
    const BATCH = 200;
    let attempted = 0;
    const failedBatches = [];
    for (let i = 0; i < orphans.length; i += BATCH) {
      const batch = orphans.slice(i, i + BATCH);
      console.log(
        `Removendo lote ${i / BATCH + 1}: ${batch.length} arquivos...`
      );
      const { error } = await supabase.storage
        .from('product-images')
        .remove(batch);
      attempted += batch.length;
      if (error) {
        console.error('Erro ao remover lote:', error.message || error);
        failedBatches.push({
          batchIndex: i / BATCH + 1,
          error: error.message || error,
        });
      }
    }

    console.log(
      `Remoção concluída. Tentativas de remoção: ${attempted}. Falhas de lote: ${failedBatches.length}`
    );

    // Gravamos o relatório final
    const reportPath = path.join(
      process.cwd(),
      'scripts',
      `removed-orphans-report-${ts}.json`
    );
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        { timestamp: new Date().toISOString(), attempted, failedBatches },
        null,
        2
      )
    );
    console.log(`Relatório de remoção salvo em: ${reportPath}`);
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
})();
