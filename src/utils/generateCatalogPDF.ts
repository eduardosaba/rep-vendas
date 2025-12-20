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
  priceType?: 'price' | 'sale_price'; // 'price' = custo, 'sale_price' = sugerido
  title: string;
  storeName?: string;
  coverImageUrl?: string;
  storeLogo?: string;
  imageZoom?: number;
  itemsPerPage?: number;
  brandMapping?: Record<string, string | null>;
  secondaryColor?: string; // Cor secundária para a capa
  onProgress?: (progress: number, message: string) => void; // Callback de progresso
}

interface ProcessedImage {
  base64: string;
  width: number;
  height: number;
  ratio: number;
}

// Função para comprimir imagem antes de adicionar ao PDF
const compressImage = (
  base64: string,
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<string> => {
  return new Promise((resolve) => {
    // Verifica se está no browser
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      resolve(base64);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensiona se necessário (máximo 800px de largura para produtos)
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64);
          return;
        }

        // Preencher fundo branco para preservar aparência quando houver transparência
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        // Detectar formato original para preservar PNG/WebP quando possível
        const isPng = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.test(base64);
        const mime =
          isPng && base64.toLowerCase().includes('png')
            ? 'image/png'
            : 'image/jpeg';
        const compressed = canvas.toDataURL(mime, quality);
        resolve(compressed);
      } catch (error) {
        // Se falhar, retorna original
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64); // Fallback para original se falhar
    img.src = base64;
  });
};

const getUrlData = async (
  url: string,
  compress: boolean = true
): Promise<ProcessedImage | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    // Helper: converte Blob para dataURL compatível com browser e Node
    const blobToDataURL = async (b: Blob): Promise<string | null> => {
      try {
        // Ambiente Node (ex: execução em server-side) - usa arrayBuffer + Buffer
        if (
          typeof window === 'undefined' ||
          typeof FileReader === 'undefined'
        ) {
          // In Node, Buffer may exist on global
          if (typeof (global as any).Buffer !== 'undefined') {
            const ab = await b.arrayBuffer();
            const buf = Buffer.from(ab);
            const mime = b.type || 'image/png';
            return `data:${mime};base64,${buf.toString('base64')}`;
          }
          return null;
        }

        // Browser: usa FileReader
        return await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(b);
        });
      } catch (e) {
        return null;
      }
    };

    const base64 = await blobToDataURL(blob);
    if (!base64) return null;

    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = async () => {
        try {
          let dataUrl = base64;
          if (compress) {
            dataUrl = await compressImage(dataUrl, 800, 0.7);
          }
          resolve({
            base64: dataUrl,
            width: img.width,
            height: img.height,
            ratio: img.width / img.height,
          });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = base64;
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

// Compor uma imagem sobre fundo branco (preserva aparência quando imagem tem fundo escuro/transparência)
const compositeOnWhite = async (
  img: ProcessedImage
): Promise<ProcessedImage> => {
  if (typeof document === 'undefined') return img;
  return await new Promise<ProcessedImage>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'Anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(img);
        // fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        const out = canvas.toDataURL('image/png');
        resolve({
          base64: out,
          width: canvas.width,
          height: canvas.height,
          ratio: canvas.width / canvas.height,
        });
      } catch (e) {
        resolve(img);
      }
    };
    image.onerror = () => resolve(img);
    image.src = img.base64;
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

  // Type guard helper
  const isValidProcessedImage = (
    img: ProcessedImage | null
  ): img is ProcessedImage => {
    return img !== null && typeof img === 'object' && 'base64' in img;
  };

  const totalSteps =
    products.length +
    (options.brandMapping ? uniqueBrands.length : 0) +
    (autoCoverUrl ? 1 : 0) +
    ((options as any).storeLogo ? 1 : 0);
  let completedSteps = 0;

  const updateProgress = (step: number, message: string) => {
    completedSteps += step;
    const progress = Math.min(
      100,
      Math.round((completedSteps / totalSteps) * 100)
    );
    options.onProgress?.(progress, message);
  };

  const promises: Promise<void>[] = [];

  // A. Imagens Produtos
  products.forEach((product, index) => {
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
          // Comprime imagens de produtos para reduzir tamanho do PDF
          const data = await getUrlData(urlToLoad, true);
          if (data) productImages[product.id] = data;
        }
        updateProgress(
          1,
          `Carregando imagens dos produtos (${index + 1}/${products.length})...`
        );
      })()
    );
  });

  // B. Logos Marcas
  if (options.brandMapping) {
    uniqueBrands.forEach((brandName, index) => {
      const url = options.brandMapping?.[brandName];
      if (url) {
        promises.push(
          (async () => {
            // Para logos de marca, não forçar compressão para preservar transparência
            const data = await getUrlData(url, false);
            if (data) brandLogosData[brandName] = data;
            updateProgress(
              1,
              `Carregando logos das marcas (${index + 1}/${uniqueBrands.length})...`
            );
          })()
        );
      }
    });
  }

  // C. Logo da Capa (Específico)
  if (autoCoverUrl) {
    promises.push(
      (async () => {
        // Imagem da capa: não forçar compressão para preservar transparência
        const bc = await getUrlData(autoCoverUrl!, false);
        if (bc) brandCoverData = await compositeOnWhite(bc);
        updateProgress(1, 'Carregando imagem da capa...');
      })()
    );
  }

  // D. Logo da Loja (Usuário)
  if ((options as any).storeLogo) {
    promises.push(
      (async () => {
        // Logo do representante: não forçar compressão para preservar transparência
        const sd = await getUrlData((options as any).storeLogo!, false);
        if (sd) storeLogoData = await compositeOnWhite(sd);
        updateProgress(1, 'Carregando logo do representante...');
      })()
    );
  }

  options.onProgress?.(0, 'Iniciando geração do PDF...');
  await Promise.all(promises);
  options.onProgress?.(50, 'Criando capa do catálogo...');

  // ==========================================
  //               A CAPA
  // ==========================================

  // Usa cor secundária configurada ou fallback padrão
  let secondaryColor = [13, 27, 44]; // Cor padrão (#0d1b2c)
  if (options.secondaryColor) {
    // Converte hex para RGB
    const hex = options.secondaryColor.replace('#', '');
    secondaryColor = [
      parseInt(hex.substr(0, 2), 16),
      parseInt(hex.substr(2, 2), 16),
      parseInt(hex.substr(4, 2), 16),
    ];
  }

  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
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
    // Só adiciona espaço se tiver logo válido, senão não precisa
    if (isValidProcessedImage(storeLogoData)) {
      yPos += 10;
    }
  }

  // LOGO DO REPRESENTANTE (só mostra se existir e tiver dados válidos)
  if (isValidProcessedImage(storeLogoData)) {
    if (!options.storeName) {
      yPos += 5; // Se não tiver nome, adiciona espaço antes do logo
    }
    const maxUserLogoW = 40;
    const maxUserLogoH = 20;

    let uW = maxUserLogoW;
    const sd: ProcessedImage = storeLogoData; // Type guard garante que não é null
    let uH = uW / sd.ratio;
    if (uH > maxUserLogoH) {
      uH = maxUserLogoH;
      uW = uH * sd.ratio;
    }

    const xUser = (210 - uW) / 2;

    // Só desenha tarja branca se realmente tiver logo válido
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
      // Usa o tipo de preço escolhido pelo usuário
      const priceToShow =
        options.priceType === 'sale_price'
          ? (product.sale_price ?? product.price)
          : product.price;
      row.push(
        new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(priceToShow)
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

  options.onProgress?.(80, 'Adicionando logos e numeração das páginas...');

  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);

    let rightX = 210 - 15; // Posição inicial no canto direito
    let storeLogoH = 0;

    // Logo do representante no topo direito (se existir e tiver dados válidos)
    if (isValidProcessedImage(storeLogoData)) {
      const logoData: ProcessedImage = storeLogoData;
      const storeLogoW = 15;
      storeLogoH = storeLogoW / (logoData.ratio || 1);
      const logoX = rightX - storeLogoW;
      const logoY = 8;
      try {
        // Desenhar fundo branco por trás do logo pequeno para evitar transparência/cores indesejadas
        doc.setFillColor(255, 255, 255);
        doc.rect(logoX - 1, logoY - 1, storeLogoW + 2, storeLogoH + 2, 'F');
        const fmt = detectImageFormat(logoData.base64);
        doc.addImage(
          logoData.base64,
          fmt,
          logoX,
          logoY,
          storeLogoW,
          storeLogoH
        );
        rightX = logoX - 5; // Ajusta posição para próximo logo
      } catch (e) {
        console.warn('generateCatalogPDF: failed adding small store logo', e);
        storeLogoH = 0; // Reset se falhar
      }
    }

    // Logo da marca no topo direito (se existir)
    // Prioriza logo da capa, depois logos das marcas
    let brandLogoData: ProcessedImage | null = null;
    if (isValidProcessedImage(brandCoverData)) {
      brandLogoData = brandCoverData;
    } else if (uniqueBrands.length === 1) {
      const brandName = uniqueBrands[0];
      const brandLogo = brandLogosData[brandName];
      if (isValidProcessedImage(brandLogo)) {
        brandLogoData = brandLogo;
      }
    } else if (uniqueBrands.length > 0) {
      // Se tiver múltiplas marcas, usa a primeira que tiver logo válido
      for (const brandName of uniqueBrands) {
        const brandLogo = brandLogosData[brandName];
        if (isValidProcessedImage(brandLogo)) {
          brandLogoData = brandLogo;
          break;
        }
      }
    }

    if (isValidProcessedImage(brandLogoData)) {
      const hW = 12;
      const hH = hW / (brandLogoData.ratio || 1);
      const hX = rightX - hW;
      // Alinha verticalmente com o logo do representante se existir
      const hY = storeLogoH > 0 ? 8 + (storeLogoH - hH) / 2 : 5;
      try {
        // Desenhar fundo branco por trás do logo da marca
        doc.setFillColor(255, 255, 255);
        doc.rect(hX - 1, hY - 1, hW + 2, hH + 2, 'F');
        const fmt = detectImageFormat(brandLogoData.base64);
        doc.addImage(brandLogoData.base64, fmt, hX, hY, hW, hH);
      } catch (e) {
        console.warn('generateCatalogPDF: failed adding small brand logo', e);
      }
    }

    doc.text(
      `Página ${i} de ${pageCount} - ${options.storeName || 'Catálogo'}`,
      105,
      290,
      { align: 'center' }
    );
  }

  options.onProgress?.(100, 'Finalizando PDF...');
  doc.save(`Catalogo_${options.title.replace(/\s+/g, '_')}.pdf`);
  options.onProgress?.(100, 'PDF gerado com sucesso!');
};
