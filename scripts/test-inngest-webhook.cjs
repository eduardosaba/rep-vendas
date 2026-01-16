#!/usr/bin/env node
const crypto = require('crypto');

function usage() {
  console.log(
    'Usage: node scripts/test-inngest-webhook.cjs [--url URL] [--event NAME] [--dry]'
  );
  process.exit(1);
}

const argv = process.argv.slice(2);
let url = 'http://localhost:3000/api/inngest';
let eventName = 'catalog/sync.requested';
let dry = false;

for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--url') url = argv[++i];
  else if (a === '--event') eventName = argv[++i];
  else if (a === '--dry') dry = true;
  else usage();
}

let secret =
  process.env.INNGEST_SIGNING_SECRET || process.env.INNGEST_SIGNING_KEY;
if (!secret) {
  try {
    const fs = require('fs');
    const env = fs.readFileSync('.env.local', 'utf8');
    const m =
      env.match(/^INNGEST_SIGNING_SECRET=(.*)$/m) ||
      env.match(/^INNGEST_SIGNING_KEY=(.*)$/m);
    if (m) secret = m[1].trim();
  } catch (e) {
    // ignore
  }
}
if (!secret) {
  console.error(
    'Missing INNGEST_SIGNING_SECRET or INNGEST_SIGNING_KEY in environment or .env.local'
  );
  process.exit(2);
}

const payload = {
  name: eventName,
  data: { userId: 'test-user-' + Date.now() },
  id: `test-${Date.now()}`,
  time: new Date().toISOString(),
};

const body = JSON.stringify(payload);
const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
const ts = Math.floor(Date.now() / 1000);
const headers = {
  'Content-Type': 'application/json',
  'inngest-signature': sig,
  'x-inngest-signature': sig,
  'inngest-signature-timestamp': String(ts),
  'inngest-signature-v1': sig,
};

if (dry) {
  console.log('Dry run - payload and headers:');
  console.log('URL:', url);
  console.log('Body:', body);
  console.log('Headers:', headers);
  process.exit(0);
}

(async () => {
  try {
    let res = await fetch(url, { method: 'POST', body, headers });
    let text = await res.text();
    if (res.status === 500 && /No function ID found/i.test(text)) {
      console.log(
        'Server returned No function ID; retrying with { event } wrapper...'
      );
      const wrapped = JSON.stringify({ event: payload });
      const sig2 = crypto
        .createHmac('sha256', secret)
        .update(wrapped)
        .digest('hex');
      const headers2 = {
        ...headers,
        'inngest-signature': sig2,
        'x-inngest-signature': sig2,
      };
      res = await fetch(url, {
        method: 'POST',
        body: wrapped,
        headers: headers2,
      });
      text = await res.text();
    }
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Request failed', err);
    process.exit(3);
  }
})();
