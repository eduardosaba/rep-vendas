import jsPDF from 'jspdf';

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '').padEnd(6, '0');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
};

const getSafeImage = async (
  url: string
): Promise<{ b64: string; w: number; h: number } | null> => {
  if (!url) return null;
  try {
    let safeUrl = url;
    if (url.includes('supabase.co/storage')) {
      const parts = url.split('/public/');
      if (parts.length > 1) {
        safeUrl = `/api/storage-image?path=${encodeURIComponent(parts[1])}`;
      }
    }

    // Use fetch to probe the resource first and download the blob.
    // This prevents the browser from emitting an uncontrolled GET that results
    // in a visible 404 in DevTools when the file is missing.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(safeUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return null;

    const blob = await resp.blob();

    // Create an object URL for the blob and load into an Image to measure dimensions
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const loaded = await new Promise<boolean>((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = objectUrl;
    });
    // revoke object URL
    URL.revokeObjectURL(objectUrl);
    if (!loaded) return null;

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return {
      b64: canvas.toDataURL('image/jpeg', 0.9),
      w: img.naturalWidth,
      h: img.naturalHeight,
    };
  } catch (e) {
    return null;
  }
};

export const generateCatalogPDF = async (products: any[], options: any) => {
  const doc = new jsPDF();
  const pageW = 210;
  const pageH = 297;
  const margin = 12;
  const primaryRGB = hexToRgb(options.primaryColor);
  const secondaryRGB = hexToRgb(options.secondaryColor);

  options.onProgress?.(10, 'Baixando ativos e convertendo WebP...');

  const imageMap: Record<string, any> = {};
  const qrMap: Record<string, string> = {};
  let brandLogo: any = null;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const url =
      p.image_url ||
      (p.image_path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${p.image_path.replace('public/', '')}`
        : null);

    if (url) {
      const res = await getSafeImage(url);
      if (res) imageMap[p.id] = res;
    }

    if (!brandLogo && p.brand && options.brandMapping?.[p.brand]) {
      const logoRes = await getSafeImage(options.brandMapping[p.brand]);
      if (logoRes) {
        brandLogo = logoRes;
      } else {
        try {
          options.onLogoFallback?.({
            type: 'brand',
            brand: p.brand,
            url: options.brandMapping[p.brand],
          });
        } catch (e) {
          // ignore callback errors
        }
      }
    }

    if (options.showQR) {
      const pUrl = `${options.baseUrl}/catalogo/${options.catalogSlug}?p=${p.slug || p.id}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(pUrl)}`;
      const qrRes = await getSafeImage(qrUrl);
      if (qrRes) qrMap[p.id] = qrRes.b64;
    }

    options.onProgress?.(
      10 + (i / products.length) * 60,
      `Processando: ${i + 1}/${products.length}`
    );
  }

  // --- CAPA DO PDF ---
  doc.setFillColor(secondaryRGB[0], secondaryRGB[1], secondaryRGB[2]);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(0, 0, 12, pageH, 'F');

  let storeLogoRes: any = null;
  if (options.storeLogo) {
    storeLogoRes = await getSafeImage(options.storeLogo);
    if (!storeLogoRes) {
      try {
        options.onLogoFallback?.({ type: 'store', url: options.storeLogo });
      } catch (e) {
        // ignore
      }
    }
  }

  const fallbackLogo = await getSafeImage('/link.webp');
  const finalCoverLogo = brandLogo || storeLogoRes;
  const wantTextCover = !finalCoverLogo && options.primaryBrandName;
  const isCenter = options.logoPosition === 'center';

  if (finalCoverLogo) {
    const ratio = finalCoverLogo.w / finalCoverLogo.h;
    const targetW = isCenter ? 80 : 60;
    const targetH = targetW / ratio;
    const logoY = isCenter ? 140 : 50;
    const pad = 10;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect((pageW - targetW) / 2 + 6 - pad, logoY - pad, targetW + (pad * 2), targetH + (pad * 2), 5, 5, 'F');
    try {
      const fmt = 'JPEG';
      doc.addImage(finalCoverLogo.b64, fmt, (pageW - targetW) / 2 + 6, logoY, targetW, targetH);
    } catch (e) {
      console.warn('generateCatalogPDF: failed adding cover image', e);
    }
  }

  // If there's no cover image but a primary brand name, render the brand name prominently
  if (!finalCoverLogo && wantTextCover) {
    doc.setTextColor(255);
    doc.setFontSize(48);
    doc.setFont('helvetica', 'bold');
    const brandText = String(options.primaryBrandName).toUpperCase();
    const lines = doc.splitTextToSize(brandText, 160);
    const y = isCenter ? 140 : 100;
    doc.text(lines, (pageW / 2) + 6, y, { align: 'center' });
  }

  doc.setTextColor(255);
  doc.setFontSize(32); doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(options.title.toUpperCase(), 150);
  const titleY = isCenter ? 85 : 160;
  doc.text(titleLines, (pageW / 2) + 6, titleY, { align: 'center' });

  // NOME DO REPRESENTANTE / USUÁRIO (DINÂMICO) - usa options.storeName
  doc.setFontSize(14); doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  const storeDisplayName = options.storeName || options.representativeName || '';
  const nameY = titleY + (titleLines.length * 15);
  if (storeDisplayName) {
    doc.text(`REPRESENTANTE: ${String(storeDisplayName).toUpperCase()}`, (pageW / 2) + 6, nameY, { align: 'center' });
  }

  // Nome da loja/rodapé (mantido)
  doc.text(options.storeName || '', 30, 260); // Nome da loja no rodapé

  // --- GRADE ---
  const cols = options.itemsPerRow || 2;
  const rowsPerPage = cols === 3 ? 5 : 4;
  const gap = 6;
  const cardW = (pageW - margin * 2 - gap * (cols - 1)) / cols;
  const availableH = pageH - 50;
  const cardH = (availableH - gap * (rowsPerPage - 1)) / rowsPerPage;

  const drawPageLayout = () => {
    doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.rect(0, 0, pageW, pageH, 'F');
    if (brandLogo) {
      const bRatio = brandLogo.w / brandLogo.h;
      const bW = 22;
      const bH = bW / bRatio;
      doc.addImage(brandLogo.b64, 'JPEG', pageW - bW - 12, 8, bW, bH);
    }
    doc.setFontSize(7);
    doc.setTextColor(255);
    doc.text(options.title, margin, 12);
  };

  doc.addPage();
  drawPageLayout();

  let curX = margin;
  let curY = 25;
  let itemsOnPage = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (itemsOnPage >= cols * rowsPerPage) {
      doc.addPage();
      drawPageLayout();
      curX = margin;
      curY = 25;
      itemsOnPage = 0;
    }

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(curX, curY, cardW, cardH, 2, 2, 'F');

    const imgData = imageMap[p.id];
    const imgAreaH = cardH * 0.62;

    if (imgData) {
      const ratio = Math.min(
        (cardW - 4) / imgData.w,
        (imgAreaH - 4) / imgData.h
      );
      const finalW = imgData.w * ratio;
      const finalH = imgData.h * ratio;
      doc.addImage(
        imgData.b64,
        'JPEG',
        curX + (cardW - finalW) / 2,
        curY + (imgAreaH - finalH) / 2 + 2,
        finalW,
        finalH
      );
      doc.link(curX, curY, cardW, imgAreaH, {
        url: `${options.baseUrl}/catalogo/${options.catalogSlug}?p=${p.slug || p.id}`,
      });
    }

    if (options.showQR && qrMap[p.id]) {
      const qrSize = cols === 3 ? 8 : 11;
      doc.addImage(
        qrMap[p.id],
        'JPEG',
        curX + cardW - qrSize - 2,
        curY + imgAreaH + 2,
        qrSize,
        qrSize
      );
    }

    const textY = curY + imgAreaH + 8;
    doc.setTextColor(40);
    doc.setFontSize(cols === 3 ? 6 : 8);
    doc.setFont('helvetica', 'bold');
    doc.text(p.reference_code || '', curX + 3, textY);

    if (options.showPrices) {
      const price =
        options.priceType === 'sale_price' ? p.sale_price || p.price : p.price;
      doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
      doc.text(`R$ ${price}`, curX + 3, textY + (cols === 3 ? 4 : 6));
    }

    itemsOnPage++;
    if (itemsOnPage % cols === 0) {
      curX = margin;
      curY += cardH + gap;
    } else {
      curX += cardW + gap;
    }
  }

  options.onProgress?.(100, 'Salvo!');
  doc.save(`${options.title.replace(/\s+/g, '_')}.pdf`);
};
