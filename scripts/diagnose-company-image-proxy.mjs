#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const companySlug = (process.argv[2] || '').trim();
const arg3 = (process.argv[3] || '').trim();
const arg4 = (process.argv[4] || '').trim();
const repSlug = arg3 && !/^https?:\/\//i.test(arg3) ? arg3 : null;
const baseUrl = (/^https?:\/\//i.test(arg3) ? arg3 : arg4) || 'http://localhost:4000';

if (!companySlug) {
  console.error('Uso: node scripts/diagnose-company-image-proxy.mjs <company-slug> [rep-slug] [baseUrl]');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl || !serviceKey) {
  console.error('Faltam envs: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function extractStoragePath(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const marker = '/storage/v1/object/public/';
  if (s.includes(marker)) {
    return s.split(marker).pop()?.replace(/^\/+/, '') || null;
  }

  if (!/^https?:\/\//i.test(s) && !s.startsWith('/api/storage-image')) {
    return s.replace(/^\/+/, '').replace(/^public\//, '');
  }

  return null;
}

async function resolveProducts(companyId, representativeId) {
  let rows = null;
  let error = null;

  // Schema varia entre ambientes: alguns têm seller_id, outros não.
  const withSeller = await supabase
    .from('products')
    .select('id,name,image_path,image_url,external_image_url,seller_id,is_active,created_at')
    .or(`company_id.eq.${companyId},user_id.eq.${companyId}`)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(120);

  if (withSeller.error) {
    const fallback = await supabase
      .from('products')
      .select('id,name,image_path,image_url,external_image_url,is_active,created_at')
      .or(`company_id.eq.${companyId},user_id.eq.${companyId}`)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(120);
    rows = fallback.data;
    error = fallback.error;
  } else {
    rows = withSeller.data;
    error = withSeller.error;
  }

  if (error) throw error;
  const list = Array.isArray(rows) ? rows : [];

  if (representativeId && list.some((p) => Object.prototype.hasOwnProperty.call(p, 'seller_id'))) {
    const sellerProducts = list.filter((p) => String(p.seller_id || '') === String(representativeId));
    if (sellerProducts.length > 0) return sellerProducts;
    return list.filter((p) => p.seller_id == null);
  }

  return list;
}

async function main() {
  const { data: company, error: cErr } = await supabase
    .from('companies')
    .select('id,slug,name')
    .ilike('slug', companySlug.toLowerCase())
    .maybeSingle();

  if (cErr || !company) {
    console.error('Empresa não encontrada:', companySlug, cErr?.message || cErr || '');
    process.exit(2);
  }

  let representative = null;
  if (repSlug) {
    const { data: rep, error: rErr } = await supabase
      .from('profiles')
      .select('id,slug,full_name,company_id')
      .ilike('slug', repSlug.toLowerCase())
      .eq('company_id', company.id)
      .maybeSingle();

    if (rErr) {
      console.error('Erro buscando representante:', rErr.message || rErr);
      process.exit(3);
    }

    representative = rep;
    if (!representative) {
      console.error('Representante não encontrado para a empresa:', repSlug);
      process.exit(4);
    }
  }

  const products = await resolveProducts(company.id, representative?.id || null);
  const sample = products.slice(0, 5);

  console.log('============================================================');
  console.log('Diagnóstico de Imagens do Catálogo');
  console.log('Empresa:', company.name, `(${company.slug})`);
  console.log('Representante:', representative ? `${representative.slug} (${representative.id})` : 'N/A');
  console.log('Base URL:', baseUrl);
  console.log('Produtos elegíveis:', products.length);
  console.log('Amostra testada:', sample.length);
  console.log('============================================================\n');

  const report = [];

  for (const p of sample) {
    let path = extractStoragePath(p.image_path) || extractStoragePath(p.image_url) || null;

    if (!path) {
      // fallback para product_images
      const { data: imgs } = await supabase
        .from('product_images')
        .select('storage_path,url,is_primary,position')
        .eq('product_id', p.id)
        .order('is_primary', { ascending: false })
        .order('position', { ascending: true })
        .limit(3);

      if (Array.isArray(imgs) && imgs.length > 0) {
        const first = imgs[0];
        path = extractStoragePath(first.storage_path) || extractStoragePath(first.url) || null;
      }
    }

    if (!path) {
      report.push({
        productId: p.id,
        product: p.name,
        path: null,
        status: 'NO_PATH',
      });
      continue;
    }

    const url = `${baseUrl.replace(/\/$/, '')}/api/storage-image?path=${encodeURIComponent(path)}&debug=1`;
    let status = 0;
    let ok = false;
    let detail = null;

    try {
      const res = await fetch(url, { method: 'GET' });
      status = res.status;
      ok = res.ok;
      const ct = String(res.headers.get('content-type') || '');
      if (ct.includes('application/json')) {
        const j = await res.json();
        detail = j?.error || j?.path || null;
      }
    } catch (e) {
      detail = String(e?.message || e);
    }

    report.push({
      productId: p.id,
      product: p.name,
      path,
      status,
      ok,
      detail,
    });
  }

  for (const row of report) {
    console.log(`${row.ok ? 'OK ' : 'ERR'} | ${row.status || '-'} | ${row.productId} | ${row.product}`);
    console.log(`      path: ${row.path || '(sem path)'}`);
    if (row.detail) console.log(`      detalhe: ${row.detail}`);
  }

  const okCount = report.filter((r) => r.ok).length;
  const noPathCount = report.filter((r) => r.status === 'NO_PATH').length;

  console.log('\nResumo:', {
    totalTestado: report.length,
    ok: okCount,
    falhas: report.length - okCount - noPathCount,
    semPath: noPathCount,
  });
}

main().catch((err) => {
  console.error('Falha no diagnóstico:', err?.message || err);
  process.exit(9);
});
