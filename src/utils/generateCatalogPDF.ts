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
  class_core?: string | null;
}

interface CatalogOptions {
  showPrices: boolean;
  priceType?: 'price' | 'sale_price';
  title: string;
  storeName?: string;
  coverImageUrl?: string;
  storeLogo?: string;
  imageZoom?: number;
  itemsPerPage?: number;
  brandMapping?: Record<string, string | null>;
  secondaryColor?: string;
  primaryColor?: string;
  coverTemplate?: number;
  onProgress?: (progress: number, message: string) => void;
}

interface ProcessedImage {
  base64: string;
  width: number;
  height: number;
  ratio: number;
}

const compressImage = (
  base64: string,
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<string> => {
  return new Promise((resolve) => {
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

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const isPng = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.test(base64);
        const mime =
          isPng && base64.toLowerCase().includes('png')
            ? 'image/png'
            : 'image/jpeg';
        resolve(canvas.toDataURL(mime, quality));
      } catch {
        resolve(base64);
      }
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
};

// --- FUNÇÃO ATUALIZADA COM PROXY PARA EVITAR CORS ---
const getUrlData = async (
  url: string,
  compress: boolean = true
): Promise<ProcessedImage | null> => {
  if (!url) return null;

  try {
    // 1. Define se a URL é externa e precisa de Proxy
    // Imagens da Safilo ou outros hosts externos falham no fetch direto devido ao CORS
    const isExternal = !url.includes('supabase.co') && url.startsWith('http');

    // 2. Se for externa, usa a sua rota de API como ponte.
    // Use URL absoluta para evitar problemas com basePath/service workers.
    const proxyPath = `/api/image-proxy?url=${encodeURIComponent(url)}`;
    const finalUrl = isExternal
      ? typeof window !== 'undefined'
        ? `${window.location.origin}${proxyPath}`
        : proxyPath
      : url;

    let res: Response | null = null;
    try {
      res = await fetch(finalUrl);
    } catch (e) {
      // falha no fetch (network/CORS). Se for externa, tentar fetch direto como fallback
      console.warn(
        'generateCatalogPDF: fetch falhou (proxy) para',
        finalUrl,
        e
      );
      if (isExternal) {
        try {
          res = await fetch(url);
        } catch (e2) {
          console.error(
            'generateCatalogPDF: fetch direto também falhou para',
            url,
            e2
          );
          return null;
        }
      } else {
        return null;
      }
    }
    if (!res) return null;
    if (!res.ok) {
      console.warn(
        `generateCatalogPDF: fetch retornou status ${res.status} para ${finalUrl}`
      );
      return null;
    }

    const blob = await res.blob();

    const blobToDataURL = async (b: Blob): Promise<string | null> => {
      try {
        if (
          typeof window === 'undefined' ||
          typeof FileReader === 'undefined'
        ) {
          if (
            typeof (global as unknown as { Buffer?: unknown }).Buffer !==
            'undefined'
          ) {
            const ab = await b.arrayBuffer();
            const buf = Buffer.from(ab);
            return `data:${b.type || 'image/png'};base64,${buf.toString('base64')}`;
          }
          return null;
        }
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(b);
        });
      } catch {
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
          if (compress) dataUrl = await compressImage(dataUrl, 800, 0.7);
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
    console.error('Erro ao processar imagem para o PDF:', url, error);
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
    return 'PNG';
  } catch {
    return 'PNG';
  }
};

// --- FUNÇÃO AUXILIAR: HEX -> RGB ARRAY ---
const hexToRgbArray = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '').padEnd(6, '0');
  return [
    parseInt(h.substring(0, 2), 16) || 0,
    parseInt(h.substring(2, 4), 16) || 0,
    parseInt(h.substring(4, 6), 16) || 0,
  ];
};

const compositeOnWhite = async (
  img: ProcessedImage
): Promise<ProcessedImage> => {
  if (typeof document === 'undefined') return img;
  return await new Promise<ProcessedImage>((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(img);
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
      } catch {
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

  const zoom = options.imageZoom || 1;
  const baseSize = 25;
  const cellWidth = baseSize * zoom;
  const cellHeight = cellWidth;

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(
    /\/$/,
    ''
  );

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

  const productImages: Record<string, ProcessedImage> = {};
  const brandLogosData: Record<string, ProcessedImage> = {};
  const productBrandLogos: Record<string, ProcessedImage> = {};
  let brandCoverData: ProcessedImage | null = null;
  let storeLogoData: ProcessedImage | null = null;

  const totalSteps =
    products.length +
    uniqueBrands.length +
    (autoCoverUrl ? 1 : 0) +
    (options.storeLogo ? 1 : 0);
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
  products.forEach((product) => {
    promises.push(
      (async () => {
        let urlToLoad: string | null = null;
        if (product.image_path) {
          // --- LIMPEZA E DETECÇÃO DE BUCKET/PATH ---
          // Trata casos como:
          // - 'public/brands/hugo-boss/..' (prefixo 'public' usado por import)
          // - 'product-images/...' (bucket explícito)
          // - 'brands/..' ou apenas 'abc.jpg'
          const rawPath = String(product.image_path).replace(/^\/+/, '');
          const parts = rawPath.split('/').filter(Boolean);
          let bucket = 'product-images';
          let key = rawPath;

          if (parts.length > 1) {
            // se o primeiro segmento for 'public', ignoramos e usamos o bucket padrão
            if (parts[0] === 'public') {
              bucket = 'product-images';
              key = parts.slice(1).join('/');
            } else if (parts[0] === 'product-images' || parts[0] === 'brands') {
              bucket = parts.shift()!;
              key = parts.join('/');
            } else {
              // caso geral: use bucket padrão e todo o caminho como chave
              bucket = 'product-images';
              key = rawPath;
            }
          } else {
            // apenas um segmento -> filename, use bucket padrão
            bucket = 'product-images';
            key = rawPath;
          }

          urlToLoad = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(
            bucket
          )}/${encodeURIComponent(key)}`;
        } else if (product.external_image_url) {
          urlToLoad = product.external_image_url;
        } else if (product.image_url && product.image_url.startsWith('http')) {
          urlToLoad = product.image_url;
        }

        if (urlToLoad) {
          const data = await getUrlData(urlToLoad, true);
          if (data) productImages[product.id] = data;
        }
        // Se houver um caminho de logo específico no produto, tentar carregar
        if ((product as any).brand_logo_path) {
          try {
            const rawPath = String((product as any).brand_logo_path).replace(
              /^\/+/,
              ''
            );
            const parts = rawPath.split('/').filter(Boolean);
            let bucket = 'product-images';
            let key = rawPath;

            if (parts.length > 1) {
              if (parts[0] === 'public') {
                bucket = 'product-images';
                key = parts.slice(1).join('/');
              } else if (
                parts[0] === 'product-images' ||
                parts[0] === 'brands'
              ) {
                bucket = parts.shift()!;
                key = parts.join('/');
              } else {
                bucket = 'product-images';
                key = rawPath;
              }
            }

            const logoUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(
              bucket
            )}/${encodeURIComponent(key)}`;
            const logoData = await getUrlData(logoUrl, false);
            if (logoData)
              productBrandLogos[product.id] = await compositeOnWhite(logoData);
          } catch (err) {
            // ignore errors no logo
          }
        }
        updateProgress(1, `Carregando produtos...`);
      })()
    );
  });

  // B. Logos Marcas
  uniqueBrands.forEach((brandName) => {
    const url = options.brandMapping?.[brandName];
    if (url) {
      promises.push(
        (async () => {
          const data = await getUrlData(url, false);
          if (data) brandLogosData[brandName] = data;
          updateProgress(1, `Carregando logos...`);
        })()
      );
    }
  });

  // C. Capa e Logo da Loja
  if (autoCoverUrl) {
    promises.push(
      (async () => {
        const bc = await getUrlData(autoCoverUrl!, false);
        if (bc) brandCoverData = await compositeOnWhite(bc);
        updateProgress(1, 'Carregando capa...');
      })()
    );
  }

  // Logo da loja pode ser usado em futuras atualizações
  if (options.storeLogo) {
    promises.push(
      (async () => {
        const _storeLogoData = await getUrlData(options.storeLogo!, false);
        if (_storeLogoData)
          storeLogoData = await compositeOnWhite(_storeLogoData);
        updateProgress(1, 'Carregando logo da loja...');
      })()
    );
  }

  await Promise.all(promises);
  await Promise.all(promises);

  // --- RESTANTE DO CÓDIGO DE DESENHO DO PDF ---
  const pageW = 210;
  const pageH = 297;

  const primaryRGB = options.primaryColor
    ? hexToRgbArray(options.primaryColor)
    : [31, 111, 235];
  const secondaryRGB = options.secondaryColor
    ? hexToRgbArray(options.secondaryColor)
    : [13, 27, 44];

  // 1) CAPA ESTILO REVISTA (PRIMÁRIA + BARRA LATERAL)
  doc.setFillColor(secondaryRGB[0], secondaryRGB[1], secondaryRGB[2]);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Barra lateral fina com cor primária
  doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.rect(0, 0, 6, pageH, 'F');

  let currentY = 50;

  // Logo centralizada (prefere brandCoverData, fallback storeLogoData)
  if (brandCoverData || storeLogoData) {
    const logo = (brandCoverData || storeLogoData) as unknown as ProcessedImage;       
    const maxW = 80;
    const drawW = Math.min(maxW, logo.width);
    const drawH = drawW / logo.ratio;
    const x = (pageW - drawW) / 2;

    // Moldura sutil
    doc.setFillColor(255, 255, 255);
    doc.setGState && doc.setGState({ opacity: 0.05 } as any);
    try {
      doc.roundedRect(x - 5, currentY - 5, drawW + 10, drawH + 10, 3, 3, 'F');
    } catch {}
    // reset opacity not strictly necessary
    doc.addImage(logo.base64, detectImageFormat(logo.base64), x, currentY, drawW, drawH);
    currentY += drawH + 30;
  }

  // Título
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(42);
  const splitTitle = doc.splitTextToSize(options.title.toUpperCase(), 160);
  doc.text(splitTitle, pageW / 2, currentY, { align: 'center' });

  // Linha decorativa
  currentY += 20;
  doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.setLineWidth(1.5);
  doc.line(pageW / 2 - 15, currentY, pageW / 2 + 15, currentY);

  // Rodapé da capa com informações do representante
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 200, 200);
  doc.text('REPRESENTANTE OFICIAL', pageW / 2, pageH - 45, { align: 'center' });

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(options.storeName || '', pageW / 2, pageH - 35, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
  doc.text('EDIÇÃO DIGITAL 2026', pageW / 2, pageH - 20, { align: 'center', charSpace: 2 });

  // Avança para o miolo
  doc.addPage();
  const tableHead = [['FOTO', 'DETALHES']];
  if (options.showPrices) tableHead[0].push('PREÇO');

  const tableBody = products.map((product) => {
    // Always show detailed content (name, ref, brand, category)
    const detailsContent = `Produto: ${product.name}\nRef: ${product.reference_code || '-'}\nMarca: ${product.brand || '-'}\nCat: ${product.category || '-'}`;
    const row = ['', detailsContent];
    if (options.showPrices) {
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

  // Cabeçalho das páginas internas
  const drawHeader = (data: any) => {
    doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.rect(0, 0, pageW, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(options.title.toUpperCase(), 10, 10);
    doc.text(options.storeName || '', pageW - 10, 10, { align: 'right' });
  };

  autoTable(doc as jsPDF & { autoTable?: unknown }, {
    startY: 20,
    margin: { top: 25, bottom: 20 },
    rowPageBreak: 'avoid',
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [secondaryRGB[0], secondaryRGB[1], secondaryRGB[2]], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { minCellHeight: cellHeight, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: cellWidth },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', fontStyle: 'bold', textColor: [0, 100, 0] },
    },
    didDrawPage: drawHeader,
    didDrawCell: (data: {
      section: string;
      column: { index: number };
      row: { index: number };
      cell: { x: number; y: number; width: number; height: number };
    }) => {
      if (data.section === 'body' && data.column.index === 0) {
        const product = products[data.row.index];
        const imgData = productImages[product.id];
        if (imgData) {
          // Preserve aspect ratio and center the image inside the cell
          const padding = 2; // small padding inside cell
          const maxW = data.cell.width - padding * 2;
          const maxH = data.cell.height - padding * 2;

          // imgData.ratio = width / height
          let drawW = maxW;
          let drawH = drawW / imgData.ratio;

          if (drawH > maxH) {
            drawH = maxH;
            drawW = drawH * imgData.ratio;
          }

          const offsetX = data.cell.x + (data.cell.width - drawW) / 2;
          const offsetY = data.cell.y + (data.cell.height - drawH) / 2;

          doc.addImage(
            imgData.base64,
            detectImageFormat(imgData.base64),
            offsetX,
            offsetY,
            drawW,
            drawH
          );
        }
      }
      // Desenha o logo da marca do produto no canto superior direito da célula de detalhes
      if (data.section === 'body' && data.column.index === 1) {
        const product = products[data.row.index];
        const logo = productBrandLogos[product.id];
        if (logo) {
          try {
            const maxSize = 20;
            let lw = maxSize;
            let lh = lw / logo.ratio;
            if (lh > maxSize) {
              lh = maxSize;
              lw = lh * logo.ratio;
            }
            const x = data.cell.x + data.cell.width - lw - 4;
            const y = data.cell.y + 4;
            doc.addImage(
              logo.base64,
              detectImageFormat(logo.base64),
              x,
              y,
              lw,
              lh
            );
          } catch {
            // ignore drawing errors
          }
        }
      }
    },
  });

  // Paginação automática (exceto capa, que é a página 1)
  try {
    const totalPages = (doc as any).getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${totalPages}`, pageW / 2, pageH - 10, { align: 'center' });
    }
  } catch (e) {
    // ignorar se a API do jsPDF variar
  }

  doc.save(`Catalogo_${options.title.replace(/\s+/g, '_')}.pdf`);
  options.onProgress?.(100, 'PDF gerado com sucesso!');
};
