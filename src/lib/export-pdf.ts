import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const exportOrdersToPDF = (
  orders: any[],
  storeName: string,
  rangeLabel: string
) => {
  const doc = new jsPDF();
  const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

  // 1. Cabeçalho do Relatório
  doc.setFontSize(20);
  doc.setTextColor(185, 114, 46); // Cor #b9722e (Primary)
  doc.text('RepVendas - Relatório de Pedidos', 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Empresa: ${storeName}`, 14, 30);
  doc.text(`Período: ${rangeLabel}`, 14, 35);
  doc.text(`Gerado em: ${dateStr}`, 14, 40);

  // 2. Formatação dos Dados para a Tabela
  const tableRows = orders.map((order) => [
    `#${order.display_id}`,
    order.clients?.name || order.client_name_guest || 'Cliente Visitante',
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(order.total_value),
    order.status,
    format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR }),
  ]);

  // 3. Geração da Tabela
  autoTable(doc, {
    startY: 45,
    head: [['Pedido', 'Cliente', 'Valor Total', 'Status', 'Data']],
    body: tableRows,
    theme: 'striped',
    headStyles: {
      fillColor: [185, 114, 46],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: { fontSize: 9 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'center' },
    },
  });

  // 4. Download do Ficheiro
  doc.save(`relatorio-pedidos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
