'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export const exportInventoryPDF = async (products: any[], store: any) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  const primaryColor = store.primary_color || '#b9722e';

  // 1. Filtrar apenas o que precisa de reposição
  const lowStockItems = products.filter(
    (p) => p.stock_quantity <= p.min_stock_level
  );

  // 2. Cabeçalho
  doc.setFontSize(14);
  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Reposição de Stock', margin, 18);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${store.name || 'Minha Loja'}  •  Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
    margin,
    24
  );

  // 3. Tabela de Reposição
  const tableBody = lowStockItems.map((p) => {
    const needToOrder = Math.max(0, p.min_stock_level - p.stock_quantity);
    return [
      p.name,
      p.stock_quantity.toString(),
      p.min_stock_level.toString(),
      {
        content: needToOrder.toString(),
        styles: { fontStyle: 'bold', textColor: [185, 114, 46] },
      },
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [['PRODUTO', 'SALDO ATUAL', 'NÍVEL MÍNIMO', 'QTD. A PEDIR']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 8, lineColor: primaryColor, lineWidth: 0.01 },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
    },
  });

  // 4. Rodapé Informativo
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    'Este relatório lista apenas produtos que atingiram ou estão abaixo do nível de segurança.',
    margin,
    finalY
  );

  doc.save(`Reposicao_Stock_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
