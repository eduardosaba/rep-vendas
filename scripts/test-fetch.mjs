#!/usr/bin/env node
import fetch from 'node-fetch';
import sharp from 'sharp';
import process from 'process';

async function run() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node scripts/test-fetch.mjs <image-url>');
    process.exit(2);
  }

  console.log('Fetching:', url);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://commportal-images.safilo.com/',
      },
      signal: AbortSignal.timeout(30000),
    });
    console.log('HTTP', res.status, res.statusText);
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error('Fetch failed body:', txt.slice(0, 500));
      process.exit(3);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(
      'Downloaded bytes:',
      buf.length,
      'time_ms:',
      Date.now() - start
    );

    console.log('Converting to webp (medium 600w)...');
    const out = await sharp(buf)
      .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    console.log('Converted size (KB):', Math.round(out.length / 1024));

    console.log('Success');
    process.exit(0);
  } catch (err) {
    console.error(
      'Error during fetch/convert:',
      err && (err.stack || err.message || String(err))
    );
    process.exit(1);
  }
}

run();
