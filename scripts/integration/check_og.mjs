import process from 'process';

const url = process.argv[2] || 'http://localhost:3000/catalogo/eduardosaba';

async function fetchWithTimeout(u, timeout = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(u, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

(async () => {
  try {
    console.log('Fetching', url);
    const pageRes = await fetchWithTimeout(url, 8000);
    console.log('PAGE_STATUS', pageRes.status);
    const html = await pageRes.text();
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
    console.log('Checking image URL...', ogImage);
    try {
      const imgRes = await fetchWithTimeout(ogImage, 8000);
      console.log('IMAGE_STATUS', imgRes.status);
      console.log(
        'IMAGE_CONTENT_TYPE',
        imgRes.headers.get('content-type') || '<none>'
      );
    } catch (e) {
      console.error('ERROR fetching image:', e.message);
      process.exit(1);
    }
  } catch (e) {
    console.error('ERROR', e.message);
    process.exit(1);
  }
})();
