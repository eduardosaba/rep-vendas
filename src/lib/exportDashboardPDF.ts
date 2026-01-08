import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Reutilizando sua lógica de conversão de imagem
const getBase64ImageFromURL = (url: string): Promise<any> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({
          base64: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
        });
      } else resolve(null);
    };
    img.onerror = () => resolve(null);
  });
};

export const exportDashboardPDF = async (
  orders: any[],
  store: any,
  rangeLabel: string
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const primaryColor = store.primary_color || '#b9722e';

  // 1. Cabeçalho & Logo
  const logoUrl =
    store.logo_url ||
    'https://aawghxjbipcqefmikwby.supabase.co/storage/v1/object/public/logos/logos/repvendas.svg';
  const logoData = await getBase64ImageFromURL(logoUrl);

  if (logoData?.base64) {
    const ratio = logoData.width / logoData.height;
    doc.addImage(logoData.base64, 'PNG', margin, 12, 15 * ratio, 15);
  }

  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Pedidos Recentes', pageWidth - margin, 18, {
    align: 'right',
  });

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${store.name || 'Minha Loja'}  •  Período: ${rangeLabel}`,
    pageWidth - margin,
    24,
    { align: 'right' }
  );

  // 2. Tabela de Pedidos
  const tableBody = orders.map((order) => [
    `#${order.display_id}`,
    order.clients?.name || order.client_name_guest || 'Cliente Visitante',
    formatCurrency(order.total_value),
    order.status,
    format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR }),
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['ID', 'CLIENTE', 'VALOR', 'STATUS', 'DATA']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, lineColor: primaryColor, lineWidth: 0.01 },
    columnStyles: {
      2: { halign: 'right', fontStyle: 'bold' },
      3: { halign: 'center' },
    },
  });

  // 3. Totalizador Final do Relatório
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalGeral = orders.reduce((sum, o) => sum + o.total_value, 0);

  doc.setFillColor(primaryColor);
  doc.rect(pageWidth - margin - 50, finalY - 5, 50, 10, 'F');
  doc.setTextColor(255);
  doc.setFontSize(10);
  doc.text(
    `TOTAL: ${formatCurrency(totalGeral)}`,
    pageWidth - margin - 5,
    finalY + 1.5,
    { align: 'right' }
  );

  doc.save(`Relatorio_Pedidos_${rangeLabel.replace(/\s/g, '_')}.pdf`);
};
