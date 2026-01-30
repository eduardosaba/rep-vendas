// Versão em JS standalone do prepareProductImage (para dry-run sem transpiler)
function prepareProductImage(url) {
  if (!url || String(url).trim() === '') {
    return {
      image_url: null,
      sync_status: 'synced',
      sync_error: 'URL não fornecida',
    };
  }
  const trimmedUrl = String(url).trim();
  let isValid = false;
  try {
    const parsed = new URL(trimmedUrl);
    isValid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (_) {
    isValid = false;
  }
  if (!isValid)
    return {
      image_url: null,
      sync_status: 'failed',
      sync_error: 'URL mal formatada',
    };
  const isExternal = trimmedUrl.startsWith('http');
  const SUPABASE_HINT = process.env.NEXT_PUBLIC_SUPABASE_URL || 'supabase.co';
  const isAlreadyInternal = trimmedUrl.includes(SUPABASE_HINT);
  if (isExternal && !isAlreadyInternal) {
    return { image_url: trimmedUrl, sync_status: 'pending', sync_error: null };
  }
  return { image_url: trimmedUrl, sync_status: 'synced', sync_error: null };
}

// Amostra de linhas simulando uma importação (inclui caso Tommy Hilfiger com URL externa)
const rows = [
  {
    Nome: 'Óculos Classic',
    Referencia: 'TH-1001',
    Preco: '199,90',
    Marca: 'Tommy Hilfiger',
    UrlDaImagem: 'https://tommy.example.com/images/1.jpg',
  },
  {
    Nome: 'Óculos Modern',
    Referencia: 'BR-2002',
    Preco: '249.00',
    Marca: 'Bruno',
    UrlDaImagem:
      'https://your-supabase.supabase.co/storage/v1/object/public/product-images/abc123-main.webp',
  },
  {
    Nome: 'Sem Imagem',
    Referencia: 'NOIMG-1',
    Preco: '99',
    Marca: 'Generic',
    UrlDaImagem: '',
  },
];

function getField(row, key) {
  return row[key] || null;
}

function parsePrice(raw) {
  if (!raw && raw !== 0) return 0;
  if (typeof raw === 'string') {
    return parseFloat(raw.replace('R$', '').replace(',', '.').trim()) || 0;
  }
  return Number(raw) || 0;
}

(async () => {
  const results = rows.map((row) => {
    const coverUrl = getField(row, 'UrlDaImagem');
    const imageMeta = prepareProductImage(coverUrl || null);

    const productObj = {
      user_id: 'DRYRUN-USER',
      name: String(getField(row, 'Nome')),
      reference_code: getField(row, 'Referencia') || null,
      sku: null,
      barcode: null,
      price: parsePrice(getField(row, 'Preco')),
      sale_price: parsePrice(getField(row, 'Preco')),
      brand: getField(row, 'Marca') || null,
      category: null,
      color: null,
      description: null,

      image_path: null,
      external_image_url: coverUrl || null,
      image_url: imageMeta.image_url || null,
      sync_status: imageMeta.sync_status,
      sync_error: imageMeta.sync_error,
      image_optimized: false,
      images: [],
    };
    return productObj;
  });

  console.log('=== DRY-RUN OUTPUT ===');
  console.log(JSON.stringify(results, null, 2));
})();
