'use client';

import jsPDF from 'jspdf';

// --- HELPERS DE IMAGEM (Lógica de Pedidos com Proxy e Base64) ---

const normalizeImageUrlForFetch = (raw: string | null | undefined) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.startsWith('data:')) return s;
  if (s.startsWith('/')) return s;

  if (s.includes('supabase.co/storage') || s.includes('/storage/v1/object')) {
    const m = s.match(/\/storage\/v1\/object\/public\/(.+)$/);
    if (m && m[1]) return `/api/storage-image?path=${encodeURIComponent(m[1])}`;
    return `/api/storage-image?path=${encodeURIComponent(s)}`;
  }
  return `/api/storage-image?path=${encodeURIComponent(s)}`;
};

const getBase64ImageFromURL = async (url: string): Promise<{ base64: string | null; width: number; height: number } | null> => {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = String(reader.result);
        const img = new Image();
        img.src = base64;
        img.onload = () => resolve({ base64, width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) { return null; }
};

const hexToRgb = (hex: string): [number, number, number] => {
  const h = (hex || '#b9722e').replace('#', '').padEnd(6, '0');
  try {
    return [
      parseInt(h.substring(0, 2), 16) || 185,
      parseInt(h.substring(2, 4), 16) || 114,
      parseInt(h.substring(4, 6), 16) || 46,
    ];
  } catch (e) { return [185, 114, 46]; }
};

// --- FUNÇÃO PRINCIPAL ---

export const generateCatalogPDF = async (products: any[], options: any, returnType: 'save' | 'blob' = 'save') => {
  const doc = new jsPDF();
  const pageW = 210; const pageH = 297; const margin = 12;
  const primaryRGB = hexToRgb(options.primaryColor);
  const secondaryRGB = hexToRgb(options.secondaryColor);

  const imageMap: Record<string, any> = {};
  const qrMap: Record<string, string> = {};
  const brandLogoMap: Record<string, any> = {};

  // 1. CARREGAMENTO (Batching de 5 em 5 para não estourar a memória)
  options.onProgress?.(5, 'Carregando ativos...');
  
  // Lógica de Logos: pré-carrega logo da loja (store) e logos por marca (brandMapping)
  const systemLogoUrl = 'https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg';
  const storeLogoUrl = options.storeLogo || null;
  let storeLogo = storeLogoUrl ? await getBase64ImageFromURL(normalizeImageUrlForFetch(storeLogoUrl)!) : null;
  storeLogo = await ensurePngDataUrl(storeLogo);

  // Pré-carrega todas as logomarcas fornecidas em options.brandMapping (se houver)
  if (options.brandMapping && typeof options.brandMapping === 'object') {
    const entries = Object.entries(options.brandMapping || {});
    await Promise.all(entries.map(async ([name, url]) => {
      try {
        if (!url) return;
        const n = normalizeImageUrlForFetch(url as string);
        if (!n) return;
        const data = await getBase64ImageFromURL(n);
        if (data) brandLogoMap[String(name)] = await ensurePngDataUrl(data);
      } catch (e) {
        // ignore per-brand failures
      }
    }));
  }

  for (let i = 0; i < products.length; i += 5) {
    const batch = products.slice(i, i + 5);
    await Promise.all(batch.map(async (p) => {
      const url = normalizeImageUrlForFetch(p.image_url || p.image_path);
      if (url) {
        const data = await getBase64ImageFromURL(url);
        if (data) imageMap[p.id] = data;
      }
      // (não pré-carregamos logomarcas por produto — apenas usamos a logo da loja)
      if (options.showQR) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${options.baseUrl}/c/${options.catalogSlug}?ref=${p.reference_code}`)}`;
        const qrRes = await getBase64ImageFromURL(qrUrl);
        if (qrRes) qrMap[p.id] = qrRes.base64 || '';
      }
    }));
    options.onProgress?.(Math.round((i / products.length) * 85), `Baixando produtos...`);
  }

  // 2. DESENHO DA CAPA
  doc.setFillColor(secondaryRGB[0], secondaryRGB[1], secondaryRGB[2]);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(0, 0, 10, pageH, 'F');

  // Decide logo para capa: preferir `options.primaryBrandName` -> marca predominante nos produtos -> brandMapping -> storeLogo
  let primaryBrandName = options.primaryBrandName;
  if (!primaryBrandName) {
    try {
      const brandCounts: Record<string, number> = {};
      (products || []).forEach((pr: any) => {
        if (pr && pr.brand) brandCounts[pr.brand] = (brandCounts[pr.brand] || 0) + 1;
      });
      if (Object.keys(brandCounts).length) {
        primaryBrandName = Object.entries(brandCounts).sort((a,b) => b[1]-a[1])[0][0];
      }
    } catch (e) {
      // ignore
    }
  }
  const chosenBrandLogo = primaryBrandName && brandLogoMap[primaryBrandName] ? brandLogoMap[primaryBrandName] : null;
  // Não usar logo do sistema automaticamente; se não houver logo da marca nem storeLogo, não desenhar
  const coverLogo = chosenBrandLogo || storeLogo || null;
  if (coverLogo?.base64) {
    const ratio = coverLogo.width / coverLogo.height;
    const targetW = options.logoPosition === 'center' ? 75 : 55;
    const logoY = options.logoPosition === 'center' ? 140 : 40;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect((pageW - targetW)/2 + 5 - 10, logoY - 10, targetW + 20, (targetW/ratio) + 20, 5, 5, 'F');
    doc.addImage(coverLogo.base64, 'PNG', (pageW - targetW)/2 + 5, logoY, targetW, targetW / ratio);
  }

  doc.setTextColor(255); 
  doc.setFontSize(26); 
  doc.setFont('helvetica', 'bold');
  const titleY = options.logoPosition === 'center' ? 90 : 200;
  doc.text(options.title.toUpperCase(), pageW / 2 + 5, titleY, { align: 'center' });
  
  // Dados do Representante no rodapé da capa
  doc.setFontSize(11); 
  doc.setFont('helvetica', 'normal');
  doc.text(options.repName.toUpperCase(), pageW / 2 + 5, 270, { align: 'center' });
  doc.text(options.repPhone, pageW / 2 + 5, 277, { align: 'center' });

  // 3. PÁGINAS INTERNAS
  // Temporariamente desativamos o modo 'grouped' — trataremos como 'grid' por segurança
  const effectiveVariantLayout = options.variantLayout === 'grouped' ? 'grid' : options.variantLayout;

  let itemsToDraw: any[] = products;
  if (effectiveVariantLayout === 'grouped') {
    const map = new Map<string, { variants: any[] }>();
    (products || []).forEach((p: any) => {
      const key = p.reference_id || p.reference_code?.split('-')[0] || p.id;
      if (!map.has(key)) map.set(key, { variants: [] });
      const entry = map.get(key)!;
      entry.variants.push(p);
    });
    // Para cada grupo, ordena variantes colocando a principal (is_main) primeiro, se presente
    itemsToDraw = Array.from(map.values()).map(g => {
      g.variants.sort((a: any, b: any) => ((b?.is_main ? 1 : 0) - (a?.is_main ? 1 : 0)));
      return g;
    });
  }

  const cols = effectiveVariantLayout === 'grid' ? options.itemsPerRow : 2;
  const rows = cols === 1 ? 2 : (cols === 2 ? 4 : 5);
  const cardW = (pageW - margin * 2 - 6 * (cols - 1)) / cols;
  const cardH = (pageH - 60) / rows;

  for (let i = 0; i < itemsToDraw.length; i++) {
    // Adiciona nova página se necessário
    if (i % (cols * rows) === 0) {
      doc.addPage();
      doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]); // Fundo da página primário
      doc.rect(0, 0, pageW, pageH, 'F');
      
      // Escolhe logo para a página atual com base nos produtos que serão desenhados nesta página
      try {
        const pageSize = cols * rows;
        const pageItems = itemsToDraw.slice(i, i + pageSize);
        const pageBrandCounts: Record<string, number> = {};
        pageItems.forEach((it: any) => {
          const sample = Array.isArray(it.variants) ? it.variants[0] : it;
          if (sample && sample.brand) pageBrandCounts[sample.brand] = (pageBrandCounts[sample.brand] || 0) + 1;
        });
        let pagePrimaryBrand: string | null = null;
        if (Object.keys(pageBrandCounts).length) {
          pagePrimaryBrand = Object.entries(pageBrandCounts).sort((a,b) => b[1]-a[1])[0][0];
        }
        const pageLogo = (pagePrimaryBrand && brandLogoMap[pagePrimaryBrand]) ? brandLogoMap[pagePrimaryBrand] : (storeLogo || null);
        if (pageLogo?.base64) {
          const bW = 20;
          const bRatio = pageLogo.width / pageLogo.height;
          doc.setFillColor(255, 255, 255);
          const padW = 6;
          const padH = 4;
          const rectW = bW + padW;
          const rectH = bW / bRatio + padH;
          const rectX = pageW - rectW - margin - 2;
          const rectY = 8 - 2;
          doc.roundedRect(rectX, rectY, rectW, rectH, 2, 2, 'F');
          // Alinha a imagem centralizada dentro do quadrado branco
          const imageW = bW;
          const imageH = bW / bRatio;
          const imageX = rectX + (rectW - imageW) / 2;
          const imageY = rectY + (rectH - imageH) / 2;
          doc.addImage(pageLogo.base64, 'PNG', imageX, imageY, imageW, imageH);
        }
      } catch (e) {
        // ignore page logo failures
      }
    }

    const idx = i % (cols * rows);
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = margin + col * (cardW + 6);
    const y = 25 + row * (cardH + 6);

    doc.setFillColor(255, 255, 255); // Card sempre branco
    doc.roundedRect(x, y, cardW, cardH, 2, 2, 'F');

    const item = itemsToDraw[i];
    // suporte a agrupamento: cada item pode ser um grupo { variants: [...] }
    const isGroup = Array.isArray((item as any).variants);
    const mainProduct = isGroup ? (item as any).variants[0] : item;
    const img = imageMap[mainProduct.id];

    if (!isGroup) {
      if (img?.base64) {
        const padding = 5;
        const maxW = cardW - padding * 2;
        const maxH = cardH * 0.55;
        let dW = Math.min(maxW, img.width);
        let dH = dW * (img.height / img.width);
        if (dH > maxH) {
          dH = maxH;
          dW = dH * (img.width / img.height);
        }
        doc.addImage(img.base64, 'PNG', x + (cardW - dW)/2, y + 5, dW, dH);
      }
    } else {
      // agrupado: separa as áreas para evitar truncamento
      const padding = 6;
      const metaAreaH = 28; // espaço reservado para referência / preço / QR
      const thumbAreaH = 26; // área para miniaturas
      const mainAreaH = Math.max(40, cardH - metaAreaH - thumbAreaH - padding * 2);
      const mainMaxW = cardW - padding * 2;

      // desenha imagem principal centralizada na área principal
      if (img?.base64) {
        let dW = Math.min(mainMaxW, img.width);
        let dH = dW * (img.height / img.width);
        if (dH > mainAreaH) {
          dH = mainAreaH;
          dW = dH * (img.width / img.height);
        }
        const imageX = x + (cardW - dW) / 2;
        const imageY = y + padding;
        doc.addImage(img.base64, 'PNG', imageX, imageY, dW, dH);

        // area de miniaturas logo abaixo da imagem principal
        const variants = (item as any).variants as any[];
        const thumbs = variants.slice(1, 5); // up to 4 small variants
        const thumbCount = thumbs.length;
        if (thumbCount > 0) {
          const gap = 4;
          const availableW = cardW - padding * 2 - gap * (thumbCount - 1);
          const thumbW = Math.max(18, Math.floor(availableW / thumbCount));
          const thumbH = thumbW; // square thumbs
          const thumbY = imageY + dH + 6; // small gap below main image
          let cursorX = x + padding + (cardW - (thumbW * thumbCount + gap * (thumbCount - 1))) / 2; // center thumbs
          for (const v of thumbs) {
            const vi = imageMap[v.id];
            // fundo branco
            doc.setFillColor(255,255,255);
            doc.roundedRect(cursorX - 2, thumbY - 2, thumbW + 4, thumbH + 4, 2, 2, 'F');
            if (vi?.base64) doc.addImage(vi.base64, 'PNG', cursorX, thumbY, thumbW, thumbH);
            cursorX += thumbW + gap;
          }
        }
      } else {
        // se não houver imagem principal, ainda desenha miniaturas centralizadas no card
        const variants = (item as any).variants as any[];
        const thumbs = variants.slice(0, 4);
        const thumbCount = thumbs.length;
        if (thumbCount > 0) {
          const gap = 4;
          const availableW = cardW - padding * 2 - gap * (thumbCount - 1);
          const thumbW = Math.max(18, Math.floor(availableW / thumbCount));
          const thumbH = thumbW;
          const thumbY = y + padding + 8;
          let cursorX = x + padding + (cardW - (thumbW * thumbCount + gap * (thumbCount - 1))) / 2;
          for (const v of thumbs) {
            const vi = imageMap[v.id];
            doc.setFillColor(255,255,255);
            doc.roundedRect(cursorX - 2, thumbY - 2, thumbW + 4, thumbH + 4, 2, 2, 'F');
            if (vi?.base64) doc.addImage(vi.base64, 'PNG', cursorX, thumbY, thumbW, thumbH);
            cursorX += thumbW + gap;
          }
        }
      }
    }

    doc.setFontSize(cols === 3 ? 7 : 9);
    doc.setTextColor(40);
    doc.text(mainProduct.reference_code || '', x + 4, y + cardH - 12);

    if (options.showPrices) {
      const price = options.priceType === 'sale_price' ? mainProduct.sale_price || mainProduct.price : mainProduct.price;
      doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`R$ ${price}`, x + 4, y + cardH - 6);
    }

    if (options.showQR && qrMap[mainProduct.id]) {
      const qrS = cols === 3 ? 10 : 14;
      doc.addImage(qrMap[mainProduct.id], 'PNG', x + cardW - qrS - 2, y + cardH - qrS - 2, qrS, qrS);
    }

    // Não desenhamos logomarca por produto — mantemos apenas a logo da loja na capa/topo

    // Adiciona link clicável para o produto no catálogo público
    try {
      const catalogSlug = options.catalogSlug || 'catalogo';
      const base = (options.baseUrl || '').replace(/\/$/, '');
      const view = options.view || 'grid';
      const sort = options.sort || 'ref_desc';
      const productIdParam = encodeURIComponent(mainProduct.id);
      const productUrl = `${base}/catalogo/${encodeURIComponent(catalogSlug)}?sort=${encodeURIComponent(sort)}&view=${encodeURIComponent(view)}&productId=${productIdParam}`;
      // doc.link espera coordenadas x, y, width, height (unidades do documento)
      doc.link(x, y, cardW, cardH, { url: productUrl });
    } catch (e) {
      // não interrompe geração caso link falhe
    }
  }

  options.onProgress?.(100, 'Salvo!');
  return returnType === 'blob' ? doc.output('blob') : doc.save(`${options.title.replace(/\s+/g, '_')}.pdf`);
};

const ensurePngDataUrl = async (data: { base64: string | null; width: number; height: number } | null): Promise<{ base64: string | null; width: number; height: number } | null> => {
  if (!data || !data.base64) return data;
  const s = String(data.base64);
  try {
    // Se já for PNG ou JPEG, retorna direto
    if (s.startsWith('data:image/png') || s.startsWith('data:image/jpeg')) return data;

    // Para outros formatos (SVG, WebP, etc.) rasteriza em PNG com fundo branco
    return await new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const w = img.naturalWidth || data.width || 200;
        const h = img.naturalHeight || data.height || 80;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(data);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const png = canvas.toDataURL('image/png');
          resolve({ base64: png, width: w, height: h });
        } catch (e) {
          resolve(data);
        }
      };
      img.onerror = () => resolve(data);
      img.src = s;
      // Timeout fallback in case onload/onerror don't fire
      setTimeout(() => resolve(data), 3000);
    });
  } catch (e) {
    return data;
  }
};