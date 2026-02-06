#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env'
  );
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Buscando product_images com URLs concatenadas...');
  const { data: rows, error } = await supabase
    .from('product_images')
    .select('id,product_id,url,created_at')
    .or('url.ilike.%https://%https://%,url.ilike.%http://%http://%')
    .limit(1000);

  if (error) {
    console.error('Erro ao buscar rows:', error.message || error);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('Nenhuma URL concatenada encontrada.');
    return;
  }

  console.log(`Encontradas ${rows.length} rows concatenadas. Processando...`);

  let inserted = 0;
  let deleted = 0;

  for (const r of rows) {
    try {
      const parts = String(r.url)
        .split(/(?=https?:\/\/)/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length <= 1) {
        console.log(`Row ${r.id} aparentemente segura, pulando.`);
        continue;
      }

      // Verificar quais partes já existem para este produto
      const { data: existing = [], error: selErr } = await supabase
        .from('product_images')
        .select('url')
        .eq('product_id', r.product_id)
        .in('url', parts)
        .limit(1000);
      if (selErr) {
        console.error(
          `Erro ao checar URLs existentes para ${r.id}:`,
          selErr.message || selErr
        );
        continue;
      }

      const existingUrls = new Set(existing.map((e) => String(e.url).trim()));
      const missing = parts.filter((p) => !existingUrls.has(p.trim()));

      if (missing.length > 0) {
        const toInsert = missing.map((p) => ({
          id: randomUUID(),
          product_id: r.product_id,
          url: p,
          sync_status: 'pending',
          created_at: r.created_at || new Date().toISOString(),
        }));

        const { error: insErr } = await supabase
          .from('product_images')
          .insert(toInsert);
        if (insErr) {
          // Se for conflito de chave única, podemos ignorar e continuar
          console.error(
            `Erro ao inserir partes para row ${r.id}:`,
            insErr.message || insErr
          );
        } else {
          inserted += toInsert.length;
        }
      } else {
        console.log(
          `Todas as partes já existem para row ${r.id}, nenhuma inserção necessária.`
        );
      }

      // Re-checar se agora todas as partes existem; se sim, deletar a row original
      const { data: nowExists = [], error: recheckErr } = await supabase
        .from('product_images')
        .select('url')
        .eq('product_id', r.product_id)
        .in('url', parts)
        .limit(1000);
      if (recheckErr) {
        console.error(
          `Erro ao re-checar URLs para ${r.id}:`,
          recheckErr.message || recheckErr
        );
        continue;
      }

      const nowSet = new Set(nowExists.map((e) => String(e.url).trim()));
      const allPresent = parts.every((p) => nowSet.has(p.trim()));
      if (allPresent) {
        const { error: delErr } = await supabase
          .from('product_images')
          .delete()
          .eq('id', r.id);
        if (delErr) {
          console.error(
            `Erro ao deletar row original ${r.id}:`,
            delErr.message || delErr
          );
        } else {
          deleted += 1;
        }
      } else {
        console.log(
          `Nem todas as partes estão presentes para ${r.id}; mantendo a row original.`
        );
      }
    } catch (err) {
      console.error('Erro processando row', r.id, err.message || err);
    }
  }

  console.log(
    `Inseridas ${inserted} novas rows; removidas ${deleted} rows originais.`
  );
}

run().catch((e) => {
  console.error('Falha no script:', e.message || e);
  process.exit(1);
});
