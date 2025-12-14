import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Product {
  id: string;
  name: string;
  reference_code: string;
  price: number;
  sale_price?: number | null;
  brand: string | null;
  category: string | null;
  image_path?: string | null;
  external_image_url?: string | null;
  image_url?: string | null;
}

interface CatalogOptions {
  showPrices: boolean;
  title: string;
  storeName?: string;
  coverImageUrl?: string;
  storeLogo?: string;
  imageZoom?: number;
  itemsPerPage?: number;
  brandMapping?: Record<string, string | null>;
}

interface ProcessedImage {
  base64: string;
  width: number;
  height: number;
  ratio: number;
}

const getUrlData = async (url: string): Promise<ProcessedImage | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const img = new Image();
        img.onload = () => {
          resolve({
            base64,
            width: img.width,
            height: img.height,
            ratio: img.width / img.height,
          });
        };
        img.onerror = () => resolve(null);
        img.src = base64;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erro imagem PDF:', url);
    return null;
  }
};

const detectImageFormat = (dataUrl: string) => {
  try {
    const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
    if (!m) return 'PNG';
    const mime = m[1].toLowerCase();
    if (mime.includes('png')) return 'PNG';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'JPEG';
    if (mime.includes('webp')) return 'WEBP';
    return 'PNG';
  } catch {
    return 'PNG';
  }
};

const loadImageElement = (url: string): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
};

export const generateCatalogPDF = async (
  products: Product[],
  options: CatalogOptions
) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('pt-BR');

  const zoom = options.imageZoom || 1;
  const baseSize = 25;
  const cellWidth = baseSize * zoom;
  const cellHeight = cellWidth;

  let itemsPerPage = 10;
  if (zoom === 2) itemsPerPage = 5;
  if (zoom === 3) itemsPerPage = 3;
  if (zoom >= 4) itemsPerPage = 2;

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(
    /\/$/,
    ''
  );

  // --- 0. DETECÇÃO DA MARCA ---
  const uniqueBrands = Array.from(
    new Set(products.map((p) => p.brand).filter((b) => b && b.trim() !== ''))
  ) as string[];

  let autoCoverUrl: string | null = options.coverImageUrl || null;

  if (!autoCoverUrl && uniqueBrands.length > 0 && options.brandMapping) {
    for (const brand of uniqueBrands) {
      const url = options.brandMapping[brand];
      if (url) {
        autoCoverUrl = url;
        break;
      }
    }
  }

  // --- 1. PRÉ-CARREGAMENTO ---
  const productImages: Record<string, ProcessedImage> = {};
  const brandLogosData: Record<string, ProcessedImage> = {};
  let storeLogoData: ProcessedImage | null = null;
  let brandCoverData: ProcessedImage | null = null; // Dados específicos da capa

  const promises: Promise<void>[] = [];

  // A. Imagens Produtos
  products.forEach((product) => {
    promises.push(
      (async () => {
        let urlToLoad: string | null = null;
        if (product.image_path)
          urlToLoad = `${supabaseUrl}/storage/v1/object/public/products/${product.image_path}`;
        else if (product.external_image_url)
          urlToLoad = product.external_image_url;
        else if (product.image_url && product.image_url.startsWith('http'))
          urlToLoad = product.image_url;

        if (urlToLoad) {
          const data = await getUrlData(urlToLoad);
          if (data) productImages[product.id] = data;
        }
      })()
    );
  });

  // B. Logos Marcas
  if (options.brandMapping) {
    uniqueBrands.forEach((brandName) => {
      const url = options.brandMapping?.[brandName];
      if (url) {
        promises.push(
          (async () => {
            const data = await getUrlData(url);
            if (data) brandLogosData[brandName] = data;
          })()
        );
      }
    });
  }

  // C. Logo da Capa (Específico)
  if (autoCoverUrl) {
    promises.push(
      (async () => {
        brandCoverData = await getUrlData(autoCoverUrl!);
      })()
    );
  }

  // D. Logo da Loja (Usuário)
  if ((options as any).storeLogo) {
    promises.push(
      (async () => {
        storeLogoData = await getUrlData((options as any).storeLogo!);
      })()
    );
  }

  await Promise.all(promises);

  // ==========================================
  //               A CAPA
  // ==========================================

  doc.setFillColor(13, 27, 44);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277);

  let yPos = 80;

  // LOGOS NA CAPA
  const hasBrandLogos = Object.keys(brandLogosData).length > 0;

  // Se tiver um logo de capa principal definido ou detectado (Prioridade)
  if (brandCoverData) {
    const maxW = 100;
    const maxH = 60;
    let w = maxW;
    const bc = brandCoverData as ProcessedImage;
    let h = w / bc.ratio;
    if (h > maxH) {
      h = maxH;
      w = h * bc.ratio;
    }

    const x = (210 - w) / 2;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x - 10, yPos - 10, w + 20, h + 20, 2, 2, 'F');
    try {
      const fmt = detectImageFormat(bc.base64);
      doc.addImage(bc.base64, fmt, x, yPos, w, h);
    } catch (e) {
      console.warn('generateCatalogPDF: failed adding cover image', e);
    }

    yPos += h + 40;
  } else if (hasBrandLogos && uniqueBrands.length > 1) {
    // Várias marcas (Lado a lado)
    const brandsDraw = uniqueBrands.slice(0, 4);
    const logoH = 20;
    const gap = 5;

    let totalRowWidth = 0;
    const logosToDraw: { base64: string; w: number; h: number }[] = [];

    brandsDraw.forEach((name) => {
      const data = brandLogosData[name];
      if (data) {
        const w = logoH * data.ratio;
        logosToDraw.push({ base64: data.base64, w, h: logoH });
        totalRowWidth += w + gap;
      }
    });
    totalRowWidth -= gap;

    if (logosToDraw.length > 0) {
      let currentX = (210 - totalRowWidth) / 2;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(
        currentX - 10,
        yPos - 10,
        totalRowWidth + 20,
        logoH + 20,
        2,
        2,
        'F'
      );

      logosToDraw.forEach((logo) => {
        try {
          const fmt = detectImageFormat(logo.base64);
          doc.addImage(logo.base64, fmt, currentX, yPos, logo.w, logo.h);
        } catch (e) {
          console.warn('generateCatalogPDF: failed adding brand logo', e);
        }
        currentX += logo.w + gap;
      });
      yPos += logoH + 40;
    } else {
      yPos += 40;
    }
  } else {
    yPos += 60;
  }

  // TÍTULO
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title.toUpperCase(), 105, yPos, { align: 'center' });
  yPos += 15;

  // --- ALTERADO AQUI: TROCADO "Apresentado por" POR "Representante:" ---
  if (options.storeName) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(`Representante: ${options.storeName}`, 105, yPos, {
      align: 'center',
    });
    yPos += 10;
  }

  // LOGO DO REPRESENTANTE
  if (storeLogoData) {
    yPos += 5;
    const maxUserLogoW = 40;
    const maxUserLogoH = 20;

    let uW = maxUserLogoW;
    const sd = storeLogoData as ProcessedImage;
    let uH = uW / sd.ratio;
    if (uH > maxUserLogoH) {
      uH = maxUserLogoH;
      uW = uH * sd.ratio;
    }

    const xUser = (210 - uW) / 2;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(xUser - 2, yPos - 2, uW + 4, uH + 4, 1, 1, 'F');

    try {
      const fmt = detectImageFormat(sd.base64);
      doc.addImage(sd.base64, fmt, xUser, yPos, uW, uH);
    } catch (e) {
      console.warn('generateCatalogPDF: failed adding store logo', e);
    }
  }

  // Rodapé Capa
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado em: ${date} • ${products.length} itens`, 105, 270, {
    align: 'center',
  });

  // ==========================================
  //                MIOLO
  // ==========================================
  doc.addPage();
  const headerMargin = 15;

  const tableHead = [['FOTO', 'DETALHES']];
  if (options.showPrices) tableHead[0].push('PREÇO');

  const tableBody = products.map((product) => {
    let detailsContent = '';
    if (zoom >= 3) {
      detailsContent = product.name;
    } else {
      detailsContent = `Produto: ${product.name}\nRef: ${product.reference_code || '-'}\nMarca: ${product.brand || '-'}\nCat: ${product.category || '-'}`;
    }

    const row = ['', detailsContent];
    if (options.showPrices) {
      row.push(
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(product.sale_price ?? product.price)
      );
    }
    return row;
  });

  autoTable(
    doc as any,
    {
      startY: headerMargin,
      margin: { top: headerMargin, bottom: 20 },
      rowPageBreak: 'avoid',
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [13, 27, 44],
        textColor: 255,
        fontStyle: 'bold',
        minCellHeight: 12,
      },
      bodyStyles: { minCellHeight: cellHeight, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: cellWidth, minCellWidth: cellWidth },
        1: { cellWidth: 'auto' },
        2: {
          cellWidth: 35,
          halign: 'right',
          fontStyle: 'bold',
          textColor: [0, 100, 0],
        },
      },

      didDrawCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 0) {
          const product = products[data.row.index];
          if (!product) return;
          const imgData = productImages[product.id];

          if (imgData) {
            const availableWidth = data.cell.width - 2;
            const availableHeight = data.cell.height - 2;

            const scaleW = availableWidth / imgData.width;
            const scaleH = availableHeight / imgData.height;

            let scaleFactor = scaleW;
            if (imgData.height * scaleFactor > availableHeight * 1.8) {
              scaleFactor = Math.min(scaleW, scaleH);
            }

            const finalW = imgData.width * scaleFactor;
            const finalH = imgData.height * scaleFactor;
            const x = data.cell.x + (data.cell.width - finalW) / 2;
            const y = data.cell.y + (data.cell.height - finalH) / 2;

            try {
              const fmt = detectImageFormat(imgData.base64);
              doc.addImage(imgData.base64, fmt, x, y, finalW, finalH);
            } catch (err) {
              console.warn(
                'generateCatalogPDF: failed adding product image',
                err
              );
            }
          }
        }
      },

      didDrawRow: (data: any) => {
        const currentRow = data.row.index + 1;
        if (currentRow % itemsPerPage === 0 && currentRow < products.length) {
          data.cursor.y = doc.internal.pageSize.height;
        }
      },

      pageBreak: 'auto',
    } as any
  );

  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150);

  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);

    // Se tiver marca única E ela foi carregada, desenha logo pequeno
    if (uniqueBrands.length === 1) {
      const brandName = uniqueBrands[0];
      // Tenta pegar do cover data primeiro (que tem prioridade) ou do brandLogosData
      const logoData = brandCoverData || brandLogosData[brandName];

      if (logoData) {
        const hW = 12;
        const hH = hW / logoData.ratio;
        const hX = 210 - 14 - hW;
        const hY = 5;
        try {
          const fmt = detectImageFormat(logoData.base64);
          doc.addImage(logoData.base64, fmt, hX, hY, hW, hH);
        } catch (e) {
          console.warn('generateCatalogPDF: failed adding small brand logo', e);
        }
      }
    }

    doc.text(
      `Página ${i} de ${pageCount} - ${options.storeName || 'Catálogo'}`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(`Catalogo_${options.title.replace(/\s+/g, '_')}.pdf`);
};
