import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Settings as StoreSettings } from '@/lib/types';

// --- INTERFACES ---
interface Customer {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  cnpj?: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  reference_code?: string | null;
  brand?: string | null;
  id?: string | number;
  image_url?: string | null;
  external_image_url?: string | null;
  image_variants?: Array<{ size?: number | string; url?: string }> | null;
  optimized_variants?:
    | Array<{ size?: number | string; url?: string }>
    | Record<string, { url?: string }>
    | null;
  product_images?: Array<{ is_primary?: boolean; url?: string; optimized_variants?: any }> | null;
}

interface OrderData {
  id: number | string;
  created_at?: string | Date;
  customer: Customer;
  display_id?: string | number;
}

interface PdfRenderOptions {
  paymentTerms?: string;
  signatureUrl?: string | null;
  disclaimer?: string;
  groupByBrand?: boolean;
}

// --- HELPERS ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const resolveOrderDateLabel = (orderData: OrderData) => {
  const candidate = (orderData as any)?.created_at || (orderData as any)?.date || (orderData as any)?.closed_at || null;
  const parsed = candidate ? new Date(candidate) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('pt-BR');
  }
  return new Date().toLocaleDateString('pt-BR');
};

const getBase64ImageFromURL = async (
  url: string
): Promise<{ base64: string | null; width: number; height: number } | null> => {
  try {
    if (!url) return null;

    // If already a data URL, try to create image to get dimensions
    if (typeof url === 'string' && url.startsWith('data:')) {
      return await new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () =>
          resolve({
            base64: url,
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
        img.onerror = () => resolve(null);
      });
    }

    // Fetch the resource and convert to a blob, then to a dataURL via canvas or FileReader
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();

    // Try createImageBitmap for fast size extraction and drawing
    let bitmap: ImageBitmap | null = null;
    try {
      // NOTE: createImageBitmap may be available only in certain runtimes
      bitmap = await createImageBitmap(blob);
    } catch (e) {
      bitmap = null;
    }

    // Convert blob to dataURL
    const dataURL: string = await new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onloadend = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('FileReader failed'));
        reader.readAsDataURL(blob);
      } catch (e) {
        reject(e);
      }
    });

    if (bitmap) {
      return { base64: dataURL, width: bitmap.width, height: bitmap.height };
    }

    // Fallback: create an Image to read dimensions
    return await new Promise((resolve) => {
      const img = new Image();
      img.src = dataURL;
      img.onload = () =>
        resolve({
          base64: dataURL,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      img.onerror = () => resolve(null);
    });
  } catch (e) {
    // Any error in fetch/convert should not break PDF generation
    console.warn('getBase64ImageFromURL failed for', url, e);
    return null;
  }
};

const detectImageFormat = (dataUrlOrBase64: string | null) => {
  if (!dataUrlOrBase64 || typeof dataUrlOrBase64 !== 'string') return 'PNG';
  const m = dataUrlOrBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  if (m && m[1]) {
    const mime = m[1].toLowerCase();
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG';
    if (mime.includes('png')) return 'PNG';
    if (mime.includes('webp')) return 'WEBP';
    if (mime.includes('gif')) return 'GIF';
  }
  return 'PNG';
};

const normalizeImageUrlForFetch = (raw: string | null | undefined) => {
  if (!raw) return null;
  const s = String(raw).trim();

  // If already a data URL or absolute same-origin path, return as-is
  if (typeof s === 'string' && s.startsWith('data:')) return s;
  if (typeof s === 'string' && s.startsWith('/')) return s; // relative to same origin (e.g., /api/storage-image?...)

  // If it's a Supabase storage link or contains storage v1 public path, route through proxy
  if (s.includes('supabase.co/storage') || s.includes('/storage/v1/object')) {
    // try to extract the "public/" path part
    const m = s.match(/\/storage\/v1\/object\/public\/(.+)$/);
    if (m && m[1]) return `/api/storage-image?path=${encodeURIComponent(m[1])}`;
    // fallback: pass full URL encoded to proxy
    return `/api/storage-image?path=${encodeURIComponent(s)}`;
  }

  // If it's an http(s) URL to an external CDN, return it as-is (may be CORS-restricted)
  if (/^https?:\/\//i.test(s)) return s;

  // Otherwise treat as a storage relative path and route to proxy
  return `/api/storage-image?path=${encodeURIComponent(s)}`;
};

const extractVariantUrl = (variants: any): string | null => {
  if (!variants) return null;
  if (Array.isArray(variants)) {
    const v480 = variants.find(
      (v: any) => Number(v?.size) === 480 || String(v?.size) === '480'
    );
    if (v480?.url) return String(v480.url);
    const firstWithUrl = variants.find((v: any) => Boolean(v?.url));
    return firstWithUrl?.url ? String(firstWithUrl.url) : null;
  }
  if (typeof variants === 'object') {
    const direct480 = variants['480'] || variants[480 as any];
    if (direct480?.url) return String(direct480.url);
    const first = Object.values(variants).find((v: any) => Boolean(v?.url)) as
      | { url?: string }
      | undefined;
    return first?.url ? String(first.url) : null;
  }
  return null;
};

const normalizeBrandName = (brand: unknown): string | null => {
  const normalized = String(brand || '').trim();
  if (!normalized) return null;
  if (normalized.toLowerCase() === 'sem marca') return null;
  return normalized;
};

// --- FUNÇÃO PRINCIPAL ---
/**
 * Gera o PDF do pedido com branding dinâmico.
 * @param returnBlob Se true, retorna o arquivo como Blob em vez de disparar o download.
 */
export const generateOrderPDF = async (
  orderData: OrderData,
  store: StoreSettings,
  items: OrderItem[],
  total: number,
  returnBlob: boolean = false,
  overrideShowPrices?: boolean,
  options?: PdfRenderOptions
): Promise<void | Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Cor principal dinâmica do representante
  const primaryColor = store.primary_color || '#b9722e';

  // 1. CABEÇALHO & LOGO
  const startY = 15;
  const logoUrl =
    store.logo_url ||
    'https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg';
  const normalizedLogoUrl = normalizeImageUrlForFetch(logoUrl) || logoUrl;
  const logoData = await getBase64ImageFromURL(normalizedLogoUrl as string);

  if (logoData?.base64) {
    const targetHeight = 22;
    const ratio = logoData.width / logoData.height;
    doc.addImage(
      logoData.base64,
      'PNG',
      margin,
      startY,
      targetHeight * ratio,
      targetHeight
    );
  }

  // Título e Info do Pedido (Alinhado à direita)
  doc.setFontSize(16);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text(store.name || 'Pedido de Venda', pageWidth - margin, startY + 5, {
    align: 'right',
  });

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Pedido #${orderData.display_id || orderData.id}`,
    pageWidth - margin,
    startY + 12,
    { align: 'right' }
  );
  doc.text(
    resolveOrderDateLabel(orderData),
    pageWidth - margin,
    startY + 17,
    { align: 'right' }
  );

  // 2. BOX DOS DADOS DO CLIENTE (Com identidade visual)
  const boxY = startY + 30;
  doc.setDrawColor(primaryColor); // Borda na cor primária
  doc.setLineWidth(0.5);
  doc.setFillColor(252, 252, 252);
  doc.roundedRect(margin, boxY, contentWidth, 28, 1, 1, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin + 5, boxY + 7);

  doc.setTextColor(60);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${orderData.customer.name}`, margin + 5, boxY + 15);
  // CPF/CNPJ intentionally omitted from PDF for privacy
  doc.text(
    `Tel: ${orderData.customer.phone || '-'}  |  Email: ${orderData.customer.email || '-'}`,
    margin + 5,
    boxY + 22
  );

  // 3. TABELA DE ITENS (Customizada com a cor da marca)
  // Preparar imagens dos itens: prioriza image_variants size 480 se presente
  const itemImages: Record<
    number | string,
    { base64: string | null; width: number; height: number } | null
  > = {};
  await Promise.all(
    items.map(async (item) => {
      try {
        const variants =
          (item as any).image_variants || (item as any).optimized_variants || null;
        let chosenUrl: string | null = null;
        chosenUrl = extractVariantUrl(variants);

        if (!chosenUrl && Array.isArray((item as any).product_images)) {
          const gallery = (item as any).product_images as Array<any>;
          const primary = gallery.find((img) => Boolean(img?.is_primary) && Boolean(img?.url));
          const first = gallery.find((img) => Boolean(img?.url));
          chosenUrl = (primary?.url || first?.url || null) as string | null;
          if (!chosenUrl) {
            const variantFromGallery = gallery
              .map((img) => extractVariantUrl(img?.optimized_variants))
              .find(Boolean);
            if (variantFromGallery) chosenUrl = String(variantFromGallery);
          }
        }

        if (!chosenUrl && typeof (item as any).image_url === 'string' && (item as any).image_url.trim()) {
          chosenUrl = String((item as any).image_url).trim();
        }
        if (!chosenUrl && typeof (item as any).external_image_url === 'string' && (item as any).external_image_url.trim()) {
          chosenUrl = String((item as any).external_image_url).trim();
        }

        if (chosenUrl) {
          const normalized = normalizeImageUrlForFetch(chosenUrl);
          const imgData = normalized
            ? await getBase64ImageFromURL(normalized)
            : await getBase64ImageFromURL(chosenUrl);
          if (imgData && imgData.base64)
            itemImages[item.reference_code || item.id || item.name] = imgData;
          else itemImages[item.reference_code || item.id || item.name] = null;
        } else {
          itemImages[item.reference_code || item.id || item.name] = null;
        }
      } catch (e) {
        itemImages[item.reference_code || item.id || item.name] = null;
      }
    })
  );

  // Decide se mostramos preços (quando o catálogo público tiver preços ocultos, o PDF também deve ocultar)
  const showPrices =
    typeof overrideShowPrices === 'boolean'
      ? overrideShowPrices
      : (store as any)?.show_sale_price !== false;

  const sortedItems = [...items].sort((a, b) => {
    const ba = normalizeBrandName(a.brand);
    const bb = normalizeBrandName(b.brand);
    const baKey = ba || '~~~';
    const bbKey = bb || '~~~';
    const brandCmp = baKey.localeCompare(bbKey, 'pt-BR');
    if (brandCmp !== 0) return brandCmp;
    return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
  });

  const brandCounts = sortedItems.reduce((acc, item) => {
    const brandName = normalizeBrandName(item.brand);
    if (!brandName) return acc;
    acc[brandName] = (acc[brandName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tableBody = (options?.groupByBrand === false ? sortedItems : sortedItems).flatMap((item, index, arr) => {
    const brandName = normalizeBrandName(item.brand);
    const details = brandName
      ? `${item.name}\nMarca: ${brandName}`
      : item.name;
    const priceStr = showPrices ? formatCurrency(item.price) : 'Sob consulta';
    const totalStr = showPrices ? formatCurrency(item.price * item.quantity) : 'Sob consulta';
    const prevBrand = index > 0 ? normalizeBrandName(arr[index - 1].brand) : null;
    const currentBrand = brandName;
    const shouldShowGroupHeader =
      options?.groupByBrand !== false &&
      Boolean(currentBrand) &&
      (brandCounts[currentBrand || ''] || 0) >= 2 &&
      prevBrand !== currentBrand;

    const brandHeader = !shouldShowGroupHeader
      ? []
      : [showPrices ? ['', '', `MARCA: ${currentBrand}`, '', '', ''] : ['', '', `MARCA: ${currentBrand}`, '']];
    // primeira coluna reservada para foto (renderizada em didDrawCell)
    // Se não mostramos preços, omitimos as colunas UNIT/TOTAL do corpo
    const imageKey = String(item.reference_code || item.id || item.name || `row-${index}`);
    const row = showPrices
      ? [imageKey, item.reference_code || '-', details, item.quantity, priceStr, totalStr]
      : [imageKey, item.reference_code || '-', details, item.quantity];
    return [...brandHeader, row];
  });

  autoTable(doc, {
    startY: boxY + 35,
    head: showPrices
      ? [['FOTO', 'REF', 'PRODUTO / MARCA', 'QTD', 'UNIT', 'TOTAL']]
      : [['FOTO', 'REF', 'PRODUTO / MARCA', 'QTD']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor, // Cabeçalho na cor da marca
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      lineColor: primaryColor, // Bordas da tabela seguindo a marca
      lineWidth: 0.05,
      cellPadding: 3,
    },
    columnStyles: showPrices
      ? {
          0: { cellWidth: 30 },
          1: { cellWidth: 25, fontStyle: 'bold' },
          2: { cellWidth: 'auto' },
          3: { halign: 'center', cellWidth: 15 },
          4: { halign: 'right', cellWidth: 30 },
          5: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
        }
      : {
          0: { cellWidth: 30 },
          1: { cellWidth: 25, fontStyle: 'bold' },
          2: { cellWidth: 'auto' },
          3: { halign: 'center', cellWidth: 15 },
        },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    didDrawCell: (data: any) => {
      // Coluna FOTO (índice 0)
      if (data.section === 'body' && data.column.index === 0) {
        const rawRow = tableBody[data.row.index] as any[];
        if (rawRow && typeof rawRow[2] === 'string' && rawRow[2].startsWith('MARCA:')) {
          return;
        }
        const imageKey = String(rawRow?.[0] || '');
        const item = sortedItems.find(
          (it) => String(it.reference_code || it.id || it.name || '') === imageKey
        );
        if (!item) return;
        const key = item.reference_code || item.id || item.name;
        const imgData = itemImages[key];
        if (imgData && imgData.base64) {
          const padding = 2;
          const maxW = data.cell.width - padding * 2;
          const maxH = data.cell.height - padding * 2;
          let drawW = Math.min(maxW, imgData.width);
          let drawH = drawW * (imgData.height / Math.max(imgData.width, 1));
          if (drawH > maxH) {
            drawH = maxH;
            drawW = drawH * (imgData.width / Math.max(imgData.height, 1));
          }
          const offsetX = data.cell.x + (data.cell.width - drawW) / 2;
          const offsetY = data.cell.y + (data.cell.height - drawH) / 2;
          try {
            const fmt = detectImageFormat(imgData.base64 as any);
            doc.addImage(
              imgData.base64 as any,
              fmt,
              offsetX,
              offsetY,
              drawW,
              drawH
            );
          } catch (e) {
            // ignore image draw errors
          }
        }
      }
    },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        const rawRow = tableBody[data.row.index] as any[];
        if (rawRow && typeof rawRow[2] === 'string' && rawRow[2].startsWith('MARCA:')) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [20, 20, 20];
          data.cell.styles.fillColor = [245, 245, 245];
          if (data.column.index !== 2) data.cell.text = '';
        } else if (data.column.index === 0) {
          data.cell.text = '';
        }
      }
    },
  });

  // 4. TOTALIZADOR DESTACADO
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  // If prices are hidden in the catalog, add a legend to explain placeholders
  if (!showPrices) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text('Valores não informados no catálogo', margin, finalY - 4);
    doc.setFont('helvetica', 'bold');
  }
  doc.setFillColor(primaryColor);
  doc.rect(pageWidth - margin - 60, finalY - 5, 60, 10, 'F');

  doc.setTextColor(255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const totalLabel = showPrices ? `TOTAL: ${formatCurrency(total)}` : 'TOTAL: Sob consulta';
  doc.text(totalLabel, pageWidth - margin - 5, finalY + 1.5, { align: 'right' });

  // 4.1 Condição de pagamento (quando informada)
  if (options?.paymentTerms) {
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.setFont('helvetica', 'normal');
    doc.text(`Condição: ${options.paymentTerms}`, margin, finalY + 7);
  }

  // 4.2 Assinatura opcional
  let signatureBottomY = finalY + 10;
  if (options?.signatureUrl) {
    const signSource = normalizeImageUrlForFetch(options.signatureUrl) || options.signatureUrl;
    const signData = await getBase64ImageFromURL(signSource);
    if (signData?.base64) {
      const desiredW = 55;
      const ratio = signData.width / Math.max(signData.height, 1);
      const desiredH = Math.max(14, desiredW / Math.max(ratio, 1));
      const boxY = finalY + 10;
      const boxX = margin;

      if (boxY + desiredH + 22 > pageHeight - 24) {
        doc.addPage();
        signatureBottomY = 40;
      } else {
        signatureBottomY = boxY;
      }

      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text('Assinatura do Cliente', boxX, signatureBottomY + 4);
      doc.addImage(signData.base64, detectImageFormat(signData.base64), boxX, signatureBottomY + 6, desiredW, desiredH);
      doc.setDrawColor(120);
      doc.line(boxX, signatureBottomY + desiredH + 10, boxX + 70, signatureBottomY + desiredH + 10);
      signatureBottomY = signatureBottomY + desiredH + 14;
    }
  }

  // 5. RODAPÉ (Informações de Contato e Paginação)
  const footerY = pageHeight - 15;
  doc.setDrawColor(primaryColor);
  doc.setLineWidth(0.1);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.setFont('helvetica', 'normal');

  const contactParts = [];
  if (store.name) contactParts.push(store.name);
  if (store.phone) contactParts.push(store.phone);
  if (store.email) contactParts.push(store.email);

  const footerText =
    contactParts.length > 0
      ? contactParts.join('  •  ')
      : store.footer_message || 'Obrigado pela preferência!';

  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  const disclaimer =
    options?.disclaimer ||
    'Este documento é um espelho de pedido sujeito à aprovação de crédito pela distribuidora.';
  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text(disclaimer, margin, footerY - 8);

  // Paginação automática
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: 'right' }
    );
  }

  // --- SAÍDA FINAL ---
  if (returnBlob) {
    return doc.output('blob');
  } else {
    const cleanName = (orderData.customer.name || 'pedido')
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase();
    doc.save(`Pedido_${orderData.display_id || orderData.id}_${cleanName}.pdf`);
  }
};
