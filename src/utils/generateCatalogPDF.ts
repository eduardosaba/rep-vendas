import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Product {
  id: string;
  name: string;
  reference_code: string;
  price: number;
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
  imageZoom?: number;
  itemsPerPage?: number; // Calculado automaticamente
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

  // PAGINAÇÃO AUTOMÁTICA (PADRÃO RIGOROSO)
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
  let brandCoverData: ProcessedImage | null = null;

  const promises = products.map(async (product) => {
    if (product.image_path) {
      const fullUrl = `${supabaseUrl}/storage/v1/object/public/products/${product.image_path}`;
      const imageData = await getUrlData(fullUrl);
      if (imageData) {
        productImages[product.id] = imageData;
      }
    }
  });

  if (autoCoverUrl) {
    promises.push(
      (async () => {
        brandCoverData = await getUrlData(autoCoverUrl!);
      })()
    );
  }

  await Promise.all(promises);

  // ==========================================
  //               1. A CAPA
  // ==========================================

  doc.setFillColor(13, 27, 44);
  doc.rect(0, 0, 210, 297, 'F');

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, 190, 277);

  let yPos = 80;

  if (brandCoverData) {
    const maxLogoWidth = 100;
    const maxLogoHeight = 60;

    let logoWidth = maxLogoWidth;
    let logoHeight = logoWidth / (brandCoverData as any).ratio;

    if (logoHeight > maxLogoHeight) {
      logoHeight = maxLogoHeight;
      logoWidth = logoHeight * (brandCoverData as any).ratio;
    }

    const xLogo = (210 - logoWidth) / 2;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(
      xLogo - 10,
      yPos - 10,
      logoWidth + 20,
      logoHeight + 20,
      2,
      2,
      'F'
    );

    doc.addImage(
      (brandCoverData as any).base64,
      'PNG',
      xLogo,
      yPos,
      logoWidth,
      logoHeight
    );
    yPos += logoHeight + 40;
  } else {
    yPos += 60;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title.toUpperCase(), 105, yPos, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`Gerado em: ${date} • ${products.length} itens`, 105, 270, {
    align: 'center',
  });

  // ==========================================
  //           2. O CATÁLOGO (Tabela)
  // ==========================================

  doc.addPage();

  // --- MARGEM SUPERIOR COMPACTA (15mm) ---
  const headerMargin = 15;

  const tableHead = [['FOTO', 'DETALHES']];
  if (options.showPrices) {
    tableHead[0].push('PREÇO');
  }

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
        }).format(product.price)
      );
    }
    return row;
  });

  autoTable(doc, {
    startY: headerMargin,
    margin: { top: headerMargin, bottom: 20 },

    // Evita quebra de linha dentro de um produto
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

    bodyStyles: {
      minCellHeight: cellHeight,
      valign: 'middle',
    },

    columnStyles: {
      0: {
        cellWidth: cellWidth,
        minCellWidth: cellWidth,
      },
      1: { cellWidth: 'auto' },
      2: {
        cellWidth: 35,
        halign: 'right',
        fontStyle: 'bold',
        textColor: [0, 100, 0],
      },
    },

    didDrawCell: (data) => {
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
            doc.addImage(imgData.base64, 'JPEG', x, y, finalW, finalH);
          } catch (err) {}
        }
      }
    },

    // QUEBRA DE PÁGINA RIGOROSA (Contagem)
    // @ts-ignore: plugin callback not present in typings used here
    didDrawRow: (data: any) => {
      const currentRow = data.row.index + 1;
      if (currentRow % itemsPerPage === 0 && currentRow < products.length) {
        data.cursor.y = doc.internal.pageSize.height;
      }
    },

    pageBreak: 'auto',
  });

  // ==========================================
  //      3. RODAPÉ E CABEÇALHO (Em Loop)
  // ==========================================
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(150);

  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);

    // --- LOGO PEQUENO (Canto Superior Direito) ---
    if (brandCoverData) {
      const headerLogoWidth = 12;
      const headerLogoHeight = headerLogoWidth / (brandCoverData as any).ratio;

      const headerX = 210 - 14 - headerLogoWidth;

      // Ajuste Fino: Subi para 5mm para ficar acima da margem de 15mm
      const headerY = 5;

      try {
        doc.addImage(
          (brandCoverData as any).base64,
          'PNG',
          headerX,
          headerY,
          headerLogoWidth,
          headerLogoHeight
        );
      } catch (e) {}
    }

    // --- RODAPÉ ---
    doc.text(
      `Página ${i} de ${pageCount} - ${options.storeName || 'Catálogo'}`,
      105,
      290,
      { align: 'center' }
    );
  }

  doc.save(`Catalogo_${options.title.replace(/\s+/g, '_')}.pdf`);
};
