#!/usr/bin/env node
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { nanoid } from 'nanoid';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: process.env.ENV_FILE || '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_RAW;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam variáveis de ambiente. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou SUPABASE_SERVICE_ROLE_KEY_RAW).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BRAND = process.argv[2] || 'Missoni';
const BATCH = parseInt(process.argv[3], 10) || 50;

function normalizeUrl(u) {
  try {
    const url = new URL(String(u));
    url.hash = '';
    // remove common tracking params
    url.searchParams.delete('utm_source');
    url.searchParams.delete('utm_medium');
    url.searchParams.delete('utm_campaign');
    return url.toString();
  } catch (e) {
    return String(u).trim();
  }
}

async function downloadBuffer(url) {
  const res = await fetch(url, { timeout: 30000 });
  if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const buffer = await res.arrayBuffer();
  return { buffer: Buffer.from(buffer), contentType };
}

function extFromContentType(contentType, fallback = 'jpg') {
  if (!contentType) return fallback;
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('gif')) return 'gif';
  return fallback;
}

async function internalizeBrand() {
  console.log(`Iniciando internalização para marca: ${BRAND} (batch ${BATCH})`);

  // Buscar produtos que correspondem à marca (case-insensitive)
  const { data: products, error } = await supabase
    .from('products')
    .select('id,user_id,external_image_url,images,image_url,reference_code')
    .ilike('brand', `%${BRAND}%`)
    .limit(10000);

  if (error) {
    console.error('Erro buscando produtos:', error.message);
    process.exit(1);
  }

  console.log(`Produtos encontrados: ${products.length}`);

  for (let i = 0; i < products.length; i += BATCH) {
    const chunk = products.slice(i, i + BATCH);
    console.log(`Processando chunk ${Math.floor(i / BATCH) + 1} (${chunk.length} produtos)`);

    for (const p of chunk) {
      try {
        const prodId = p.id;
        const userId = p.user_id;
        const candidateUrls = [];

        if (p.external_image_url && String(p.external_image_url).startsWith('http')) candidateUrls.push(p.external_image_url);
        if (Array.isArray(p.images)) {
          candidateUrls.push(...p.images.filter((x) => typeof x === 'string'));
        }
        if (p.image_url && typeof p.image_url === 'string' && p.image_url.startsWith('http')) candidateUrls.push(p.image_url);

        // Deduplicate and normalize
        const normMap = {};
        candidateUrls.forEach((u) => {
          const n = normalizeUrl(u);
          normMap[n] = u;
        });

        const uniqueUrls = Object.keys(normMap);
        if (uniqueUrls.length === 0) continue;

        const uploadedPaths = [];
        const galleryInserts = [];

        for (let idx = 0; idx < uniqueUrls.length; idx++) {
          const orig = uniqueUrls[idx];
          try {
            const { buffer, contentType } = await downloadBuffer(orig);
            const ext = extFromContentType(contentType);
            const base = `${Date.now()}-${nanoid(8)}`;
            const destPath = `public/${userId}/products/${base}.${ext}`;

            const { error: upErr } = await supabase.storage
              .from('product-images')
              .upload(destPath, buffer, { cacheControl: '3600', upsert: false, contentType });

            if (upErr) {
              console.warn(`Upload falhou para ${orig}: ${upErr.message}`);
              continue;
            }

            const { data: pub } = supabase.storage.from('product-images').getPublicUrl(destPath);
            const publicUrl = pub.publicUrl;
            uploadedPaths.push({ destPath, publicUrl });

            galleryInserts.push({ product_id: prodId, url: publicUrl, position: idx, sync_status: 'synced' });
          } catch (e) {
            console.warn(`Erro processando imagem ${orig} para produto ${prodId}:`, e.message);
            continue;
          }
        }

        // Inserir galeria (skip duplicados por constraints — capturamos erros)
        if (galleryInserts.length > 0) {
          for (let k = 0; k < galleryInserts.length; k += 200) {
            const gchunk = galleryInserts.slice(k, k + 200);
            const { error: gErr } = await supabase.from('product_images').insert(gchunk);
            if (gErr) {
              console.warn('Aviso: erro ao inserir galeria (pode haver duplicatas):', gErr.message);
            }
          }
        }

        // Atualizar produto: usar a primeira imagem internalizada como image_path/image_url e limpar external_image_url
        if (uploadedPaths.length > 0) {
          const first = uploadedPaths[0];
          const { data: upd, error: updErr } = await supabase
            .from('products')
            .update({ image_path: first.destPath, image_url: first.publicUrl, external_image_url: null })
            .eq('id', prodId);
          if (updErr) console.warn('Aviso: erro atualizando produto', prodId, updErr.message);
        }
      } catch (e) {
        console.error('Erro no produto:', e.message);
      }
    }
  }

  console.log('Internalização concluída.');
}

internalizeBrand().catch((e) => {
  console.error('Erro fatal:', e);
  process.exit(1);
});
