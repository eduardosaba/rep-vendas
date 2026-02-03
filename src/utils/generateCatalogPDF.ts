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
  let brandCoverData: ProcessedImage | null = null;

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
          // --- LIMPEZA DE PATH DUPLICADO PARA EVITAR ERRO 400 ---
          const cleanPath = product.image_path
            .replace(/^\/?public\//, '')
            .replace(/^\/+/, '');
          urlToLoad = `${supabaseUrl}/storage/v1/object/public/product-images/${encodeURIComponent(cleanPath)}`;
        } else if (product.external_image_url) {
          urlToLoad = product.external_image_url;
        } else if (product.image_url && product.image_url.startsWith('http')) {
          urlToLoad = product.image_url;
        }

        if (urlToLoad) {
          const data = await getUrlData(urlToLoad, true);
          if (data) productImages[product.id] = data;
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
        if (_storeLogoData) await compositeOnWhite(_storeLogoData);
        updateProgress(1, 'Carregando logo da loja...');
      })()
    );
  }

  await Promise.all(promises);

  // --- RESTANTE DO CÓDIGO DE DESENHO DO PDF (MANTIDO) ---
  // [O código da Capa e Miolo continua igual ao que você já tem...]

  // (Início do desenho da capa para garantir que o arquivo esteja fechado corretamente)
  let secondaryColor = [13, 27, 44];
  if (options.secondaryColor) {
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

  if (brandCoverData) {
    const coverData = brandCoverData as ProcessedImage;
    const maxW = 100;
    const maxH = 60;
    let w = maxW;
    let h = w / coverData.ratio;
    if (h > maxH) {
      h = maxH;
      w = h * coverData.ratio;
    }
    const x = (210 - w) / 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x - 10, yPos - 10, w + 20, h + 20, 2, 2, 'F');
    doc.addImage(
      coverData.base64,
      detectImageFormat(coverData.base64),
      x,
      yPos,
      w,
      h
    );
    yPos += h + 40;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title.toUpperCase(), 105, yPos, { align: 'center' });

  yPos += 15;
  if (options.storeName) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(`Representante: ${options.storeName}`, 105, yPos, {
      align: 'center',
    });
  }

  // MIOLO E TABELA
  doc.addPage();
  const tableHead = [['FOTO', 'DETALHES']];
  if (options.showPrices) tableHead[0].push('PREÇO');

  const tableBody = products.map((product) => {
    let detailsContent =
      zoom >= 3
        ? product.name
        : `Produto: ${product.name}\nRef: ${product.reference_code || '-'}\nMarca: ${product.brand || '-'}\nCat: ${product.category || '-'}`;
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

  autoTable(doc as jsPDF & { autoTable?: unknown }, {
    startY: 15,
    margin: { top: 15, bottom: 20 },
    rowPageBreak: 'avoid',
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [13, 27, 44], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { minCellHeight: cellHeight, valign: 'middle' },
    columnStyles: {
      0: { cellWidth: cellWidth },
      1: { cellWidth: 'auto' },
      2: { halign: 'right', fontStyle: 'bold', textColor: [0, 100, 0] },
    },
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
          doc.addImage(
            imgData.base64,
            detectImageFormat(imgData.base64),
            data.cell.x + 1,
            data.cell.y + 1,
            data.cell.width - 2,
            data.cell.height - 2
          );
        }
      }
    },
  });

  doc.save(`Catalogo_${options.title.replace(/\s+/g, '_')}.pdf`);
  options.onProgress?.(100, 'PDF gerado com sucesso!');
};
