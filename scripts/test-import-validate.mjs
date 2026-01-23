// Teste rápido de validação de URLs usado na importação
function isValidHttpUrl(u) {
  try {
    const p = new URL(u);
    return p.protocol === 'http:' || p.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function prepareProductImage(url) {
  if (!url || String(url).trim() === '') {
    return {
      image_url: null,
      sync_status: 'synced',
      sync_error: 'URL não fornecida',
    };
  }
  const trimmedUrl = String(url).trim();
  if (!isValidHttpUrl(trimmedUrl)) {
    return {
      image_url: null,
      sync_status: 'failed',
      sync_error: 'URL mal formatada',
    };
  }
  const isExternal = trimmedUrl.startsWith('http');
  const isAlreadyInternal = trimmedUrl.includes(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'supabase.co'
  );
  if (isExternal && !isAlreadyInternal) {
    return { image_url: trimmedUrl, sync_status: 'pending', sync_error: null };
  }
  return { image_url: trimmedUrl, sync_status: 'synced', sync_error: null };
}

const samples = [
  'https://commportal-images.safilo.com/10/09/81/100981000300_P00.JPG',
  'http://example.com/image.jpg',
  'ftp://example.com/file',
  'not a url',
  '',
  null,
  '   https://my-supabase.supabase.co/storage/v1/object/public/product-images/products/123-medium.webp  ',
];

for (const s of samples) {
  console.log('INPUT:', s);
  console.log('OUTPUT:', prepareProductImage(s));
  console.log('---');
}
