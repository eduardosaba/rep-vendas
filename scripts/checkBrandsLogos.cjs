#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fetch = global.fetch || require('node-fetch');

const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPA || !SERVICE) {
  console.error('Supabase credentials not found in env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPA, SERVICE);
const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node checkBrandsLogos.cjs <user_id>');
  process.exit(1);
}

const resolveFinal = (raw) => {
  if (!raw && raw !== '') return null;
  try {
    let target = raw;
    if (typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('['))) {
      try {
        const parsed = JSON.parse(raw);
        target = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch (e) {
        target = raw;
      }
    }
    let finalPath = '';
    if (typeof target === 'object' && target !== null) {
      finalPath = target.variants?.desktop?.url || target.original || target.publicUrl || target.url || '';
    } else {
      finalPath = String(target || '').trim();
    }
    if (!finalPath || finalPath === '[object Object]') return null;
    return finalPath;
  } catch (e) {
    return null;
  }
};

const toProxyPath = (finalPath) => {
  if (!finalPath) return null;
  // If contains storage public URL, extract path
  const match = finalPath.match(/\/storage\/v1\/object\/public\/(.+)$/i);
  if (match && match[1]) return match[1];
  // If looks like a full supabase storage URL with query params
  const match2 = finalPath.match(/https?:\/\/[^/]+\/storage\/.+object\/public\/(.+)$/i);
  if (match2 && match2[1]) return match2[1];
  // If starts with product-images/... or contains that prefix, normalize
  if (/product-images\//i.test(finalPath)) {
    const idx = finalPath.indexOf('product-images/');
    return finalPath.slice(idx).replace(/^\/+/, '');
  }
  // If it's an absolute path starting with '/', strip leading '/'
  if (finalPath.startsWith('/')) return finalPath.replace(/^\/+/, '');
  return finalPath;
};

(async () => {
  try {
    const { data, error } = await supabase.from('brands').select('id,name,logo_url,banner_url').eq('user_id', userId).order('name', { ascending: true });
    if (error) {
      console.error('Supabase query error:', error.message || error);
      process.exit(2);
    }
    if (!data || data.length === 0) {
      console.log('No brands found for user', userId);
      return;
    }

    for (const row of data) {
      console.log('---');
      console.log(`Brand: ${row.name} (id=${row.id})`);
      const logoFinal = resolveFinal(row.logo_url);
      const bannerFinal = resolveFinal(row.banner_url);
      console.log('  resolved logo:', logoFinal);
      console.log('  resolved banner:', bannerFinal);

      for (const [type, final] of [['logo', logoFinal], ['banner', bannerFinal]]) {
        if (!final) {
          console.log(`  ${type}: <empty>`);
          continue;
        }
        const proxyPath = toProxyPath(final);
        const url = `http://localhost:4000/api/storage-image?path=${encodeURIComponent(proxyPath || final)}&debug=1`;
        try {
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          const txt = await res.text();
          let parsed = null;
          try { parsed = JSON.parse(txt); } catch (e) { parsed = txt; }
          console.log(`  ${type} -> proxy: ${url}`);
          console.log(`    status: ${res.status}`);
          console.log(`    body: ${typeof parsed === 'string' ? parsed : JSON.stringify(parsed)}`);
        } catch (e) {
          console.log(`  ${type} -> proxy fetch error: ${e && e.message ? e.message : e}`);
        }
      }
    }
  } catch (e) {
    console.error('Unexpected error:', e && e.message ? e.message : e);
    process.exit(3);
  }
})();
