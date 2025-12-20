import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrderData {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string; // Opcional
  customerDocument?: string; // Opcional (CPF/CNPJ)
  items: any[];
  total: number;
  date: string;
}

interface StoreData {
  name: string;
  phone: string;
  email?: string;
  logo_url?: string | null;
  primary_color?: string;
}

// URL da logo padrão do sistema (fallback) derivada da env
import { SYSTEM_LOGO_URL as DEFAULT_SYSTEM_LOGO } from '@/lib/constants';
const SYSTEM_LOGO_URL = DEFAULT_SYSTEM_LOGO;

export const generateOrderPDF = async (order: OrderData, store: StoreData) => {
  const doc = new jsPDF();

  // Configurações de Layout
  const margin = 15;
  let currentY = 20;
  const pageWidth = doc.internal.pageSize.width;
  const contentWidth = pageWidth - margin * 2;

  // --- 1. LOGOTIPO (Esquerda) ---
  const logoToUse = store.logo_url || SYSTEM_LOGO_URL;

  try {
    const img = new Image();
    img.src = logoToUse;
    img.crossOrigin = 'Anonymous';

    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = () => resolve(null);
    });

    if (img.complete && img.naturalHeight !== 0) {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const imgHeight = 20;
      const imgWidth = imgHeight * imgRatio;
      // Limita largura máxima para não invadir o texto
      const finalWidth = Math.min(imgWidth, 60);
      const finalHeight = finalWidth / imgRatio;

      doc.addImage(img, 'PNG', margin, 15, finalWidth, finalHeight);
    }
  } catch (e) {
    console.warn('Erro ao carregar logo no PDF', e);
  }

  // --- 2. CABEÇALHO DO PEDIDO (Direita) ---
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(`PEDIDO #${order.id}`, pageWidth - margin, 25, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Emissão: ${order.date}`, pageWidth - margin, 32, {
    align: 'right',
  });

  currentY += 30;

  // --- 3. DADOS DO CLIENTE (Layout Ajustado) ---
  // Caixa de fundo
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(margin, currentY, contentWidth, 38, 2, 2, 'FD'); // Aumentei um pouco a altura

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120); // Cor dos labels (cinza)
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', margin + 5, currentY + 8);

  // Configuração de colunas para alinhar dados
  const col1LabelX = margin + 5;
  const col1ValueX = margin + 28; // Espaço para labels curtos (Nome, CPF)

  const col2LabelX = margin + 100;
  const col2ValueX = margin + 120; // Espaço para labels (Telefone, Email)

  const row1Y = currentY + 18;
  const row2Y = currentY + 28;

  doc.setFontSize(10);

  // --- Linha 1 ---
  // Nome
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Nome:`, col1LabelX, row1Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(order.customerName || '-', col1ValueX, row1Y);

  // Telefone
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Telefone:`, col2LabelX, row1Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(order.customerPhone || '-', col2ValueX, row1Y);

  // --- Linha 2 ---
  // Documento (CPF/CNPJ)
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`CPF/CNPJ:`, col1LabelX, row2Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(order.customerDocument || 'Não informado', margin + 28, row2Y); // Ajuste fino se o label for longo

  // Email
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Email:`, col2LabelX, row2Y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(order.customerEmail || 'Não informado', col2ValueX, row2Y);

  currentY += 48;

  // --- 4. TABELA DE ITENS ---
  const tableBody = order.items.map((item) => [
    item.reference_code || '-',
    item.name,
    item.quantity,
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(item.sale_price ?? item.price),
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format((item.sale_price ?? item.price) * item.quantity),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['CÓDIGO', 'PRODUTO', 'QTD', 'UNITÁRIO', 'TOTAL']],
    body: tableBody,
    theme: 'plain',
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: 60,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 6,
    },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      lineColor: 235,
      lineWidth: { bottom: 0.1 },
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
  });

  // Access lastAutoTable if present (added by autoTable at runtime)
  currentY =
    ((doc as any).lastAutoTable?.finalY ?? doc.internal.pageSize.height - 40) +
    10;

  // --- 5. TOTAIS (Correção de Sobreposição) ---
  const totalText = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(order.total);

  // Alinhamos o LABEL à direita também, mas com um recuo maior (offset)
  // Isso garante que ele "empurre" para a esquerda dependendo do ponto final, evitando colisão.

  // Linha divisória fina acima do total
  doc.setDrawColor(200, 200, 200);
  doc.line(
    pageWidth - margin - 80,
    currentY - 5,
    pageWidth - margin,
    currentY - 5
  );

  // Label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  // Posiciona o texto terminando em X (alinhado à direita)
  doc.text('TOTAL DO PEDIDO:', pageWidth - margin - 50, currentY + 2, {
    align: 'right',
  });

  // Valor
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0); // Preto
  doc.text(totalText, pageWidth - margin, currentY + 2, { align: 'right' });

  // --- 6. RODAPÉ (Representante) ---
  const pageHeight = doc.internal.pageSize.height;
  const footerY = pageHeight - 20;

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY - 8, pageWidth - margin, footerY - 8);

  // Info Representante
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(40, 40, 40);
  doc.text(store.name, margin, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  let contactInfo = `Telefone: ${store.phone}`;
  if (store.email) contactInfo += ` | Email: ${store.email}`;

  doc.setFontSize(8);
  doc.text(contactInfo, margin, footerY + 5);

  // Marca d'água sistema
  doc.text('Emitido via RepVendas', pageWidth - margin, footerY, {
    align: 'right',
  });

  const fileNameSafe = store.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`Pedido_${order.id}_${fileNameSafe}.pdf`);
};
