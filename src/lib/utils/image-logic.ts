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
 * Processa uma lista de URLs (string separada por vírgula OU array de strings) e retorna objetos para inserção na tabela product_images.
 * @param productId ID do produto dono das imagens.
 * @param urlsInput String contendo URLs separadas por vírgula ou Array de strings.
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
    urls = urlsInput.map((u) => u.trim()).filter((u) => u.length > 0);
  } else if (typeof urlsInput === 'string' && urlsInput.trim() !== '') {
    // Divide por vírgula, limpa espaços e remove vazios
    urls = urlsInput
      .split(',')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
  }

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
  if (url.includes('-medium.webp')) {
    return url.replace('-medium.webp', `-${size}.webp`);
  }

  if (url.includes('-small.webp')) {
    return url.replace('-small.webp', `-${size}.webp`);
  }

  if (url.includes('-large.webp')) {
    return url.replace('-large.webp', `-${size}.webp`);
  }

  // Se a URL termina em .webp genérico (sem sufixo), adiciona o sufixo antes da extensão
  if (url.endsWith('.webp')) {
    return url.replace('.webp', `-${size}.webp`);
  }

  // Retorna a URL original se não for WebP ou não seguir o padrão
  return url;
}
