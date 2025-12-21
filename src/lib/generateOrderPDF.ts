import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Settings as StoreSettings } from '@/lib/types';

// --- INTERFACES ---
interface Customer {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  cnpj?: string; // Campo para CPF ou CNPJ
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
}

// --- HELPERS ---

// Formata Moeda (BRL)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Carrega Imagem via URL, converte para PNG Base64 e retorna dimensões
// Isso resolve problemas de CORS e arquivos SVG que o jsPDF não aceita nativamente
const getBase64ImageFromURL = (
  url: string
): Promise<{ base64: string | null; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    // 'Anonymous' permite carregar imagens de domínios externos (como Supabase) no Canvas
    img.crossOrigin = 'Anonymous';
    img.src = url;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Usa as dimensões naturais para manter a proporção
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          // Converte para PNG Data URL
          const dataURL = canvas.toDataURL('image/png');
          resolve({
            base64: dataURL,
            width: canvas.width,
            height: canvas.height,
          });
        } catch (e) {
          console.warn(
            'Erro de CORS ao exportar canvas (logo não será gerada):',
            e
          );
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };

    img.onerror = () => {
      console.warn('Erro ao carregar imagem (URL inválida ou bloqueada):', url);
      resolve(null);
    };
  });
};

// --- FUNÇÃO PRINCIPAL ---
export const generateOrderPDF = async (
  orderData: OrderData,
  store: StoreSettings,
  items: OrderItem[],
  total: number
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width; // ~210mm (A4)
  const pageHeight = doc.internal.pageSize.height;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Cor principal (usa a do banco ou um cinza escuro padrão)
  const primaryColor = store.primary_color || '#1e293b';

  // ==========================================
  // 1. CABEÇALHO & LOGO
  // ==========================================
  let startY = 15;
  const headerHeight = 30; // Espaço reservado para o cabeçalho

  // Define a Logo (Do usuário ou Fallback do sistema)
  const fallbackLogo =
    'https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg';
  const logoUrl = store.logo_url || fallbackLogo;

  // Carrega a logo
  const logoData = await getBase64ImageFromURL(logoUrl);

  if (logoData && logoData.base64) {
    try {
      // Cálculo de Proporção para não esticar
      const targetHeight = 25; // Altura fixa desejada (25mm)
      // Evita divisão por zero
      const ratio = logoData.height > 0 ? logoData.width / logoData.height : 1;
      const targetWidth = targetHeight * ratio; // Largura proporcional

      doc.addImage(
        logoData.base64,
        'PNG',
        margin,
        startY,
        targetWidth,
        targetHeight
      );
    } catch (e) {
      console.warn('Falha ao desenhar logo no PDF');
    }
  }

  // Dados da Empresa (Alinhados à Direita)
  // Ajustamos o Y para alinhar visualmente com o meio da logo
  const textStartY = startY + 5;

  doc.setFontSize(18);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  const storeName = store.name || 'Pedido de Venda';
  doc.text(storeName, pageWidth - margin, textStartY, { align: 'right' });

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');

  doc.text(`Pedido #${orderData.id}`, pageWidth - margin, textStartY + 8, {
    align: 'right',
  });

  const dateStr = new Date(orderData.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(dateStr, pageWidth - margin, textStartY + 14, { align: 'right' });

  // ==========================================
  // 2. DADOS DO CLIENTE
  // ==========================================
  const boxY = startY + headerHeight + 5;

  // Fundo do box (Cinza Claro)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(200);
  doc.roundedRect(margin, boxY, contentWidth, 30, 2, 2, 'FD');

  // Título
  doc.setFontSize(9);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin + 5, boxY + 8);

  // Conteúdo
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60);

  // Linha 1: Nome
  doc.text(`Nome: ${orderData.customer.name}`, margin + 5, boxY + 16);

  // Linha 1 (Continuação): CPF/CNPJ
  // Força exibição mesmo se vazio ("Não informado") para garantir que o layout mostre o campo
  const documentText = orderData.customer.cnpj || 'Não informado';
  doc.text(`CPF/CNPJ: ${documentText}`, margin + 100, boxY + 16);

  // Linha 2: Contato
  let contactText = '';
  if (orderData.customer.phone)
    contactText += `Tel: ${orderData.customer.phone}   `;
  if (orderData.customer.email)
    contactText += `Email: ${orderData.customer.email}`;
  doc.text(contactText, margin + 5, boxY + 24);

  // ==========================================
  // 3. TABELA DE PRODUTOS
  // ==========================================
  const tableBody = items.map((item) => {
    // Monta descrição (Nome + Marca)
    const description = item.brand
      ? `${item.name}\nMarca: ${item.brand}`
      : item.name;

    return [
      item.reference_code || '-',
      description,
      item.quantity,
      formatCurrency(item.price),
      formatCurrency(item.price * item.quantity),
    ];
  });

  autoTable(doc, {
    startY: boxY + 38,
    head: [['REF', 'PRODUTO / MARCA', 'QTD', 'UNIT', 'TOTAL']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' }, // Ref
      1: { cellWidth: 'auto' }, // Produto
      2: { cellWidth: 20, halign: 'center' }, // Qtd
      3: { cellWidth: 30, halign: 'right' }, // Unit
      4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }, // Total
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      valign: 'middle',
      overflow: 'linebreak',
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
  });

  // ==========================================
  // 4. TOTAIS
  // ==========================================
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const rightAlignX = pageWidth - margin;

  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');

  const totalLabel = `TOTAL: ${formatCurrency(total)}`;
  doc.text(totalLabel, rightAlignX, finalY, { align: 'right' });

  // ==========================================
  // 5. RODAPÉ (DADOS DO REPRESENTANTE)
  // ==========================================
  const footerY = pageHeight - 15;

  // Linha divisória
  doc.setDrawColor(200);
  doc.line(margin, footerY - 6, rightAlignX, footerY - 6);

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');

  // Monta dados de contato da loja/representante
  const contactParts = [];
  if (store.name) contactParts.push(store.name);
  if (store.email) contactParts.push(store.email);
  if (store.phone) contactParts.push(store.phone);

  // Junta com separador " • "
  const footerText =
    contactParts.length > 0
      ? contactParts.join('  •  ')
      : store.footer_message || 'Obrigado pela preferência!';

  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  // Paginação
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: 'right' }
    );
  }

  // ==========================================
  // SALVAR
  // ==========================================
  const cleanName = (orderData.customer.name || 'pedido')
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase();
  doc.save(`Pedido_${orderData.id}_${cleanName}.pdf`);
};
