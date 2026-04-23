import fs from 'fs/promises';
import path from 'path';

const [,, companySlug, repSlugOrBase, maybeBase] = process.argv;
let company = companySlug;
let rep = undefined;
let base = maybeBase || repSlugOrBase || 'http://localhost:4000';

if (!company) {
  console.error('Uso: node scripts/check-catalog-snapshots.mjs <companySlug> [repSlug] [baseUrl]');
  process.exit(2);
}

if (maybeBase) {
  rep = repSlugOrBase;
} else if (repSlugOrBase && /^https?:\/\//.test(repSlugOrBase) === false) {
  rep = repSlugOrBase;
}

const outDir = path.resolve('./tmp/catalog-snapshots');
await fs.mkdir(outDir, { recursive: true });

async function fetchHtml(url) {
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  return { status: res.status, text };
}

const urls = [];
urls.push({ name: 'company', url: `${base.replace(/\/$/, '')}/catalogo/${encodeURIComponent(company)}` });
if (rep) urls.push({ name: 'company-rep', url: `${base.replace(/\/$/, '')}/catalogo/${encodeURIComponent(company)}/${encodeURIComponent(rep)}` });

const results = [];
for (const u of urls) {
  try {
    const r = await fetchHtml(u.url);
    const filename = path.join(outDir, `${u.name}-${company}${rep ? `-${rep}` : ''}.html`);
    await fs.writeFile(filename, r.text, 'utf8');
    results.push({ name: u.name, url: u.url, status: r.status, file: filename });
    console.log(`${u.name}: ${u.url} -> ${r.status} -> saved ${filename}`);
  } catch (e) {
    console.error('Erro ao buscar', u.url, e?.message || e);
    results.push({ name: u.name, url: u.url, status: 'error', error: String(e) });
  }
}

console.log('Resumo:', results);
await fs.writeFile(path.join(outDir, 'results.json'), JSON.stringify(results, null, 2), 'utf8');
process.exit(0);
