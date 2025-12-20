// Diagnostic script: diagnose DNS + fetch + https fallback (ES module)
// Usage: node scripts/diagnose-dns.js [host] [testUrl]

import dns from 'dns';
import https from 'https';

if (dns.setDefaultResultOrder) {
  try {
    dns.setDefaultResultOrder('ipv4first');
    console.log('[DIAG] dns.setDefaultResultOrder("ipv4first") applied');
  } catch (e) {
    console.warn('[DIAG] could not set default result order:', e);
  }
} else {
  console.log(
    '[DIAG] dns.setDefaultResultOrder not available in this Node version'
  );
}

const host = process.argv[2] || 'upload.wikimedia.org';
const testUrl = process.argv[3] || `https://${host}/`;

console.log('[DIAG] host:', host);
console.log('[DIAG] testUrl:', testUrl);

console.log('\n[DIAG] Running dns.lookup (all results):');

dns.lookup(host, { all: true }, (err, addresses) => {
  if (err) {
    console.error('[DIAG] dns.lookup error:', err);
  } else {
    console.log('[DIAG] dns.lookup addresses:', addresses);
  }

  dns.resolve4(host, (e4, a4) => {
    console.log('[DIAG] resolve4:', e4 ? String(e4) : a4);
    dns.resolve6(host, (e6, a6) => {
      console.log('[DIAG] resolve6:', e6 ? String(e6) : a6);

      (async () => {
        console.log('\n[DIAG] Trying fetch()...');
        try {
          const fetchFn =
            global.fetch ||
            ((url, opts) => {
              return new Promise((resolve, reject) => {
                const req = https.get(url, opts, (res) => {
                  const chunks = [];
                  res.on('data', (c) => chunks.push(c));
                  res.on('end', () => {
                    const buf = Buffer.concat(chunks);
                    resolve({
                      ok: res.statusCode >= 200 && res.statusCode < 300,
                      status: res.statusCode,
                      arrayBuffer: async () => buf,
                    });
                  });
                  res.on('error', reject);
                });
                req.on('error', reject);
              });
            });

          const res = await fetchFn(testUrl, {
            headers: { 'User-Agent': 'NodeDiagnostic/1.0' },
            method: 'GET',
          });
          console.log(
            '[DIAG] fetch returned status:',
            res.status,
            'ok:',
            res.ok
          );
          try {
            const arr = await res.arrayBuffer();
            console.log(
              '[DIAG] fetch arrayBuffer size:',
              Buffer.from(arr).length
            );
          } catch (e) {
            console.warn('[DIAG] fetch arrayBuffer failed:', e);
          }
        } catch (fetchErr) {
          console.error('[DIAG] fetch() failed:', fetchErr);

          console.log('[DIAG] Trying https.get fallback...');
          try {
            await new Promise((resolve, reject) => {
              const req = https.get(
                testUrl,
                { headers: { 'User-Agent': 'NodeDiagnostic/1.0' } },
                (res) => {
                  if (!res || res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(
                      new Error('status ' + (res?.statusCode ?? 'unknown'))
                    );
                  }
                  const chunks = [];
                  res.on('data', (c) => chunks.push(c));
                  res.on('end', () => {
                    const buf = Buffer.concat(chunks);
                    console.log('[DIAG] https.get fetched bytes:', buf.length);
                    resolve();
                  });
                  res.on('error', reject);
                }
              );
              req.on('error', reject);
            });
          } catch (httpsErr) {
            console.error('[DIAG] https.get fallback failed:', httpsErr);
          }
        }
      })();
    });
  });
});
