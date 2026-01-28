const http = require('http');
const https = require('https');

function get(u) {
  return new Promise((res, rej) => {
    const lib = u.startsWith('https') ? https : http;
    const req = lib.get(u, (r) => {
      let b = '';
      r.on('data', (c) => (b += c));
      r.on('end', () =>
        res({ status: r.statusCode, headers: r.headers, body: b })
      );
      r.on('error', (e) => rej(e));
    });
    req.on('error', (e) => rej(e));
    // timeout after 8s to avoid hanging when server is down
    req.setTimeout(8000, () => {
      req.abort();
      rej(new Error('request timeout'));
    });
  });
}

(async () => {
  const url = process.argv[2] || 'http://localhost:3000/catalogo/eduardosaba';
  try {
    console.log('Fetching', url);
    const page = await get(url);
    console.log('PAGE_STATUS', page.status);
    const html = page.body;
    const ogImage =
      (html.match(
        /<meta[^>]+property=['\"]og:image['\"][^>]+content=['\"]([^\"']+)['\"]/i
      ) || [])[1] || null;
    const ogTitle =
      (html.match(
        /<meta[^>]+property=['\"]og:title['\"][^>]+content=['\"]([^\"']+)['\"]/i
      ) || [])[1] || null;
    const ogDesc =
      (html.match(
        /<meta[^>]+property=['\"]og:description['\"][^>]+content=['\"]([^\"']+)['\"]/i
      ) || [])[1] || null;
    console.log('OG_IMAGE:', ogImage);
    console.log('OG_TITLE:', ogTitle);
    console.log('OG_DESC:', ogDesc);
    if (!ogImage) {
      console.error(
        'No og:image found — page may be missing metadata or returning 404'
      );
      process.exit(0);
    }
    console.log('Checking image URL...');
    const img = await get(ogImage);
    console.log('IMAGE_STATUS', img.status);
    console.log('IMAGE_CONTENT_TYPE', img.headers['content-type'] || '<none>');
  } catch (e) {
    console.error('ERROR', e.message);
    process.exit(1);
  }
})();
