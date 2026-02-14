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
}

interface OrderData {
  id: number | string;
  created_at: string | Date;
  customer: Customer;
  display_id?: string | number;
}

// --- HELPERS ---

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const getBase64ImageFromURL = async (
  url: string
): Promise<{ base64: string | null; width: number; height: number } | null> => {
  try {
    if (!url) return null;

    // If already a data URL, try to create image to get dimensions
    if (url.startsWith('data:')) {
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
      // @ts-ignore - createImageBitmap exists in modern browsers
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
  if (s.startsWith('data:')) return s;
  if (s.startsWith('/')) return s; // relative to same origin (e.g., /api/storage-image?...)

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
  returnBlob: boolean = false
): Promise<void | Blob> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Cor principal dinâmica do representante
  const primaryColor = store.primary_color || '#b9722e';

  // 1. CABEÇALHO & LOGO
  let startY = 15;
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
    new Date(orderData.created_at).toLocaleString('pt-BR'),
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
  doc.text(
    `CPF/CNPJ: ${orderData.customer.cnpj || 'Não informado'}`,
    margin + 100,
    boxY + 15
  );
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
          (item as any).image_variants ||
          (item as any).optimized_variants ||
          null;
        let chosenUrl: string | null = null;
        if (Array.isArray(variants) && variants.length > 0) {
          const v480 = variants.find(
            (v: any) => Number(v.size) === 480 || String(v.size) === '480'
          );
          if (v480 && v480.url) chosenUrl = v480.url;
          else if (variants[0].url) chosenUrl = variants[0].url;
        }
        if (
          !chosenUrl &&
          (item as any).image_url &&
          String((item as any).image_url).startsWith('http')
        )
          chosenUrl = (item as any).image_url;
        if (!chosenUrl && (item as any).external_image_url)
          chosenUrl = (item as any).external_image_url;

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

  const tableBody = items.map((item) => {
    const details = item.brand
      ? `${item.name}\nMarca: ${item.brand}`
      : item.name;
    const priceStr = formatCurrency(item.price);
    const totalStr = formatCurrency(item.price * item.quantity);
    // primeira coluna reservada para foto (renderizada em didDrawCell)
    return [
      '',
      item.reference_code || '-',
      details,
      item.quantity,
      priceStr,
      totalStr,
    ];
  });

  autoTable(doc, {
    startY: boxY + 35,
    head: [['FOTO', 'REF', 'PRODUTO / MARCA', 'QTD', 'UNIT', 'TOTAL']],
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
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 25, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
    didDrawCell: (data: any) => {
      // Coluna FOTO (índice 0)
      if (data.section === 'body' && data.column.index === 0) {
        const item = items[data.row.index];
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
  });

  // 4. TOTALIZADOR DESTACADO
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFillColor(primaryColor);
  doc.rect(pageWidth - margin - 60, finalY - 5, 60, 10, 'F');

  doc.setTextColor(255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `TOTAL: ${formatCurrency(total)}`,
    pageWidth - margin - 5,
    finalY + 1.5,
    { align: 'right' }
  );

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
