import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Settings as StoreSettings } from '@/lib/types';

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
  id: number;
  customer: Customer;
}

export const generateOrderPDF = (
  orderData: OrderData,
  store: StoreSettings,
  items: OrderItem[],
  total: number
) => {
  const doc = new jsPDF();

  // --- CABEÇALHO ---
  doc.setFontSize(22);
  doc.text(store.name || '', 14, 20);

  doc.setFontSize(10);
  doc.text(`Pedido #${orderData.id}`, 14, 28);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 33);

  // --- DADOS DO CLIENTE ---
  doc.setDrawColor(200);
  doc.line(14, 38, 196, 38);

  doc.setFontSize(12);
  doc.text('Dados do Cliente', 14, 45);
  doc.setFontSize(10);
  doc.text(`Nome: ${orderData.customer.name}`, 14, 52);
  doc.text(`Telefone: ${orderData.customer.phone}`, 14, 57);
  if (orderData.customer.email)
    doc.text(`Email: ${orderData.customer.email}`, 14, 62);
  if (orderData.customer.cnpj)
    doc.text(`CPF/CNPJ: ${orderData.customer.cnpj}`, 14, 67);

  // --- TABELA DE PRODUTOS ---
  const tableBody = items.map((item) => [
    item.reference_code || '-',
    item.name,
    item.brand || '',
    item.quantity,
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(item.price),
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(item.price * item.quantity),
  ]);

  autoTable(doc, {
    startY: 75,
    head: [['Ref', 'Produto', 'Marca', 'Qtd', 'Unit.', 'Total']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [20, 20, 20] }, // Cor escura para header
    styles: { fontSize: 9 },
  });

  // --- TOTAIS ---
  const finalY = ((doc as any).lastAutoTable?.finalY ?? 260) + 10;

  doc.setFontSize(14);
  doc.text(
    `Total do Pedido: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}`,
    196,
    finalY,
    { align: 'right' }
  );

  // --- RODAPÉ ---
  doc.setFontSize(8);
  doc.text(store.footer_message || 'Obrigado pela preferência!', 105, 280, {
    align: 'center',
  });

  // Salvar
  doc.save(
    `Pedido_${orderData.id}_${(orderData.customer.name || 'cliente').split(' ')[0]}.pdf`
  );
};
