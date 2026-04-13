const url = 'http://localhost:4000/api/public_catalogs/sync';
const USER_ID = 'fe7ea2fc-afd4-4310-a080-266fca8186a7';

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'test-script', timestamp: Date.now(), user_id: USER_ID }),
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY_START:\n', text.slice(0, 4000));
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
