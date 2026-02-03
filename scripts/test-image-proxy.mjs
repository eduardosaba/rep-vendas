import fs from 'fs';
import path from 'path';

const target = process.argv[2];
if (!target) {
  console.error('Usage: node scripts/test-image-proxy.mjs <image-url>');
  process.exit(1);
}

const proxyUrl = `http://localhost:3000/api/image-proxy?url=${encodeURIComponent(target)}`;

async function run() {
  console.log('Target:', target);

  try {
    console.log('\n1) Fetch directo (upstream)');
    const r1 = await fetch(target, { method: 'GET', redirect: 'follow' });
    console.log('Upstream status:', r1.status, r1.statusText);
    console.log('Upstream content-type:', r1.headers.get('content-type'));
    const ab1 = await r1.arrayBuffer();
    console.log('Upstream size:', ab1.byteLength);
    const out1 = path.join('tmp', 'upstream.bin');
    fs.mkdirSync('tmp', { recursive: true });
    fs.writeFileSync(out1, Buffer.from(ab1));
    console.log('Saved upstream to', out1);
  } catch (err) {
    console.error('Upstream fetch error:', err);
  }

  try {
    console.log('\n2) Fetch via proxy endpoint');
    const r2 = await fetch(proxyUrl, { method: 'GET', redirect: 'follow' });
    console.log('Proxy status:', r2.status, r2.statusText);
    console.log('Proxy content-type:', r2.headers.get('content-type'));
    const ab2 = await r2.arrayBuffer();
    console.log('Proxy size:', ab2.byteLength);
    const out2 = path.join('tmp', 'proxy.bin');
    fs.writeFileSync(out2, Buffer.from(ab2));
    console.log('Saved proxy response to', out2);

    // If the response is JSON (error), print body as text
    const ct = r2.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const txt = Buffer.from(ab2).toString('utf8');
      console.log('Proxy JSON body:', txt);
    }
  } catch (err) {
    console.error('Proxy fetch error:', err);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
