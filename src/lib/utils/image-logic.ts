/**
 * Prepara o objeto de imagem para o banco de dados.
 * Garante que qualquer URL externa seja marcada para processamento interno (WebP/1000px).
 * @param url A URL da imagem a ser processada.
 * @returns Um objeto com image_url, sync_status e sync_error.
 */
export function prepareProductImage(url: string | null | undefined) {
  if (!url || url.trim() === '') {
    return {
      image_url: null, // Usar NULL para que o fallback seja aplicado na UI
      sync_status: 'synced',
      sync_error: 'URL não fornecida',
    };
  }

  const trimmedUrl = url.trim();

  // Validação básica de URL: rejeita strings mal formatadas
  const isValidHttpUrl = (u: string) => {
    try {
      const parsed = new URL(u);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  if (!isValidHttpUrl(trimmedUrl)) {
    return {
      image_url: null,
      sync_status: 'failed',
      sync_error: 'URL mal formatada',
    };
  }

  // Verifica se a URL é de um serviço externo (http/s) e não do nosso próprio storage.
  const isExternal = trimmedUrl.startsWith('http');
  const isAlreadyInternal = trimmedUrl.includes(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'supabase.co'
  );

  // Se for uma URL externa e ainda não internalizada, ela vai para a fila.
  if (isExternal && !isAlreadyInternal) {
    return {
      image_url: trimmedUrl,
      sync_status: 'pending', // O Worker vai pegar daqui
      sync_error: null,
    };
  }

  // Se já for uma URL interna (do nosso Supabase Storage) ou um placeholder,
  // consideramos como já sincronizada e otimizada.
  return {
    image_url: trimmedUrl,
    sync_status: 'synced',
    sync_error: null,
  };
}

/**
 * Organiza e filtra imagens da Safilo para o RepVendas.
 * Aplica regras de negócio: P00 é capa, P13/P14 são removidas.
 * @param rawString - A string de URLs separadas por vírgula, ponto-e-vírgula ou espaço vinda do Excel.
 */
export function processSafiloImages(rawString: string | null | undefined) {
  if (!rawString || String(rawString).trim() === '') {
    return { image_url: null, images: [], sync_status: 'no_image' };
  }

  // 1. Limpa e transforma em array, removendo espaços e splitando por separadores comuns
  // IMPORTANTE: Aceita ; , \s \n como separadores (Excel pode usar ; para múltiplas URLs)
  let allUrls = String(rawString)
    .trim()
    .split(/[\s,;\n]+/)
    .map((u) => u.trim())
    .filter((u) => {
      if (!u || u.length === 0) return false;
      try {
        const p = new URL(u);
        return p.protocol === 'http:' || p.protocol === 'https:';
      } catch (_) {
        return false;
      }
    }); // Garante que é URL válida

  // 2. Filtro de Higiene: Remove P13 e P14 (Fotos técnicas inúteis para venda)
  allUrls = allUrls.filter((url) => {
    const lower = url.toLowerCase();
    const isTechnical = lower.includes('p13.') || lower.includes('p14.');
    return !isTechnical;
  });

  if (allUrls.length === 0) {
    return { image_url: null, images: [], sync_status: 'no_image' };
  }

  // 3. Busca a Capa Ideal: Tenta encontrar o padrão P00.jpg
  let coverIndex = allUrls.findIndex((url) =>
    url.toLowerCase().includes('p00.')
  );

  let finalImageUrl: string | null = null;
  let finalGallery: string[] = [];

  if (coverIndex !== -1) {
    // Se achou a P00, ela vira a capa e removemos da lista da galeria
    finalImageUrl = allUrls[coverIndex];
    finalGallery = allUrls.filter((_, index) => index !== coverIndex);
  } else {
    // Se não achou P00, a primeira vira capa e as demais galeria
    finalImageUrl = allUrls[0] || null;
    finalGallery = allUrls.slice(1);
  }

  return {
    image_url: finalImageUrl,
    images: finalGallery, // Retornando array
    sync_status: finalImageUrl ? ('pending' as const) : ('no_image' as const),
  };
}

/**
 * Processa uma lista de URLs (string separada por vírgula/ponto-e-vírgula OU array de strings) e retorna objetos para inserção na tabela product_images.
 * @param productId ID do produto dono das imagens.
 * @param urlsInput String contendo URLs separadas por vírgula, ponto-e-vírgula ou Array de strings.
 * @returns Array de objetos prontos para insert na tabela product_images.
 */
export function prepareProductGallery(
  productId: string,
  urlsInput: string | string[] | null
) {
  if (!urlsInput) {
    return [];
  }

  let urls: string[] = [];

  if (Array.isArray(urlsInput)) {
    // Flattens arrays que podem conter strings com separadores internos
    urls = urlsInput
      .flatMap((u) => {
        const str = typeof u === 'string' ? u : String(u || '');
        // Se a string contém separadores (;, ou espaço), split
        if (str.includes(';') || str.includes(',')) {
          return str.split(/[;,]+/).map((s) => s.trim());
        }
        return [str.trim()];
      })
      .filter((u) => u.length > 0);
  } else if (typeof urlsInput === 'string' && urlsInput.trim() !== '') {
    // Divide por vírgula OU ponto-e-vírgula, limpa espaços e remove vazios
    urls = urlsInput
      .split(/[;,]+/)
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
  }

  if (urls.length === 0) return [];

  // Validamos URLs e removemos entradas mal formatadas
  urls = urls.filter((u) => {
    try {
      const p = new URL(u);
      return p.protocol === 'http:' || p.protocol === 'https:';
    } catch (_) {
      return false;
    }
  });

  // Deduplicação: Remove URLs idênticas
  urls = Array.from(new Set(urls));

  if (urls.length === 0) return [];

  // Detecta se existe uma imagem Safilo P00 no conjunto (foto de capa oficial)
  const safiloP00Index = urls.findIndex(
    (url) =>
      url.toLowerCase().includes('safilo.com') &&
      url.toUpperCase().includes('_P00.')
  );

  return urls.map((url, index) => {
    const isExternal = url.startsWith('http');
    const isAlreadyInternal = url.includes(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'supabase.co'
    );

    // Lógica para definir status
    const shouldProcess = isExternal && !isAlreadyInternal;

    // Lógica de capa: Se existe P00 da Safilo, ela é a primária. Caso contrário, a primeira.
    let isPrimary = false;
    let position = index;

    if (safiloP00Index !== -1) {
      // Se encontrou uma Safilo P00, ela será a única primary
      isPrimary = index === safiloP00Index;
      position = isPrimary ? 0 : index + 1;
    } else {
      // Se não é Safilo ou não tem P00, a primeira foto da lista é a capa
      isPrimary = index === 0;
      position = index;
    }

    return {
      product_id: productId,
      url: url,
      is_primary: isPrimary,
      sync_status: shouldProcess ? 'pending' : 'synced',
      sync_error: null,
      position: position,
    };
  });
}

/**
 * Troca a versão da imagem baseada na necessidade do layout.
 * Permite usar small (200px), medium (600px) ou large (1200px) dinamicamente.
 * @param url A URL salva no banco (que termina em -medium.webp ou .webp)
 * @param size 'small' | 'medium' | 'large'
 * @returns URL com o sufixo correto ou a URL original se não for do padrão
 */
export function getProductImage(
  url: string | null | undefined,
  size: 'small' | 'medium' | 'large' = 'medium'
): string {
  if (!url) return '';

  // Se a URL já tem o padrão de múltiplas versões (-medium.webp, -small.webp, -large.webp)
  const patterns = [
    {
      ext: '.webp',
      medium: '-medium.webp',
      small: '-small.webp',
      large: '-large.webp',
    },
    {
      ext: '.jpg',
      medium: '-medium.jpg',
      small: '-small.jpg',
      large: '-large.jpg',
    },
    {
      ext: '.jpeg',
      medium: '-medium.jpeg',
      small: '-small.jpeg',
      large: '-large.jpeg',
    },
  ];

  for (const p of patterns) {
    if (url.includes(p.medium))
      return url.replace(p.medium, `-${size}${p.ext}`);
    if (url.includes(p.small)) return url.replace(p.small, `-${size}${p.ext}`);
    if (url.includes(p.large)) return url.replace(p.large, `-${size}${p.ext}`);
    if (url.endsWith(p.ext)) return url.replace(p.ext, `-${size}${p.ext}`);
  }

  // Retorna a URL original se não for WebP ou não seguir o padrão
  return url;
}
