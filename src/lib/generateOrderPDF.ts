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

const getBase64ImageFromURL = (
  url: string
): Promise<{ base64: string | null; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          const dataURL = canvas.toDataURL('image/png');
          resolve({
            base64: dataURL,
            width: canvas.width,
            height: canvas.height,
          });
        } catch (e) {
          console.warn('Erro de CORS ao exportar canvas:', e);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn('Erro ao carregar imagem:', url);
      resolve(null);
    };
  });
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
  const logoData = await getBase64ImageFromURL(logoUrl);

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
  const tableBody = items.map((item) => [
    item.reference_code || '-',
    item.brand ? `${item.name}\nMarca: ${item.brand}` : item.name,
    item.quantity,
    formatCurrency(item.price),
    formatCurrency(item.price * item.quantity),
  ]);

  autoTable(doc, {
    startY: boxY + 35,
    head: [['REF', 'PRODUTO / MARCA', 'QTD', 'UNIT', 'TOTAL']],
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
      0: { cellWidth: 25, fontStyle: 'bold' },
      2: { halign: 'center', cellWidth: 15 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
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
