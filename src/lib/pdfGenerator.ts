'use client';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface OrderData {
  id: string;
  orderNumber: string;
  createdAt: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  deliveryAddress?: string;
  paymentMethod: string;
  notes?: string;
  items: Array<{
    name: string;
    brand?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  totalValue: number;
  settings?: {
    name?: string;
    email?: string;
    phone?: string;
    logo_url?: string;
  } | null;
}

export const generateOrderPDF = async (orderData: OrderData): Promise<void> => {
  try {
    // Criar novo documento PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Configurações de fonte e cor
    pdf.setFont('helvetica', 'normal');

    // Header com logo e informações da empresa
    if (orderData.settings?.logo_url) {
      try {
        // Nota: Em produção, seria necessário carregar a imagem
        // Por enquanto, vamos usar texto
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text(orderData.settings.name || 'Rep-Vendas', 20, yPosition);
      } catch (error) {
        console.error('Erro ao carregar logo:', error);
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text(orderData.settings.name || 'Rep-Vendas', 20, yPosition);
      }
    } else {
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text(orderData.settings?.name || 'Rep-Vendas', 20, yPosition);
    }

    yPosition += 10;

    // Informações de contato da empresa
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    if (orderData.settings?.email) {
      pdf.text(`Email: ${orderData.settings.email}`, 20, yPosition);
      yPosition += 5;
    }
    if (orderData.settings?.phone) {
      pdf.text(`Telefone: ${orderData.settings.phone}`, 20, yPosition);
      yPosition += 10;
    } else {
      yPosition += 5;
    }

    // Título do documento
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PEDIDO DE COMPRA', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Linha separadora
    pdf.setLineWidth(0.5);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 10;

    // Informações do pedido
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('INFORMAÇÕES DO PEDIDO', 20, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Número do Pedido: ${orderData.orderNumber}`, 20, yPosition);
    yPosition += 6;
    pdf.text(`Data: ${orderData.createdAt}`, 20, yPosition);
    yPosition += 6;
    pdf.text(
      `Forma de Pagamento: ${getPaymentMethodLabel(orderData.paymentMethod)}`,
      20,
      yPosition
    );
    yPosition += 10;

    // Informações do cliente
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DADOS DO CLIENTE', 20, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${orderData.clientName}`, 20, yPosition);
    yPosition += 6;
    if (orderData.clientEmail) {
      pdf.text(`Email: ${orderData.clientEmail}`, 20, yPosition);
      yPosition += 6;
    }
    if (orderData.clientPhone) {
      pdf.text(`Telefone: ${orderData.clientPhone}`, 20, yPosition);
      yPosition += 6;
    }
    yPosition += 10;

    // Endereço de entrega
    if (orderData.deliveryAddress) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ENDEREÇO DE ENTREGA', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');

      // Quebrar endereço em linhas se necessário
      const addressLines = pdf.splitTextToSize(
        orderData.deliveryAddress,
        pageWidth - 40
      );
      addressLines.forEach((line: string) => {
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });
      yPosition += 10;
    }

    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = 20;
    }

    // Itens do pedido
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ITENS DO PEDIDO', 20, yPosition);
    yPosition += 10;

    // Header da tabela
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setFillColor(240, 240, 240);
    pdf.rect(20, yPosition - 5, pageWidth - 40, 8, 'F');

    pdf.text('Produto', 22, yPosition + 1);
    pdf.text('Qtd', pageWidth - 80, yPosition + 1);
    pdf.text('Preço Unit.', pageWidth - 60, yPosition + 1);
    pdf.text('Total', pageWidth - 25, yPosition + 1, { align: 'right' });

    yPosition += 8;

    // Linha dos itens
    pdf.setFont('helvetica', 'normal');
    orderData.items.forEach((item) => {
      // Verificar se precisa de nova página
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }

      // Nome do produto (com quebra de linha se necessário)
      const productName = item.brand
        ? `${item.name} (${item.brand})`
        : item.name;
      const nameLines = pdf.splitTextToSize(productName, 80);

      nameLines.forEach((line: string, index: number) => {
        if (index === 0) {
          pdf.text(line, 22, yPosition);
          pdf.text(item.quantity.toString(), pageWidth - 80, yPosition);
          pdf.text(
            `R$ ${item.unitPrice.toFixed(2)}`,
            pageWidth - 60,
            yPosition
          );
          pdf.text(
            `R$ ${item.totalPrice.toFixed(2)}`,
            pageWidth - 25,
            yPosition,
            { align: 'right' }
          );
        } else {
          pdf.text(line, 22, yPosition);
        }
        yPosition += 5;
      });

      yPosition += 2;
    });

    // Linha separadora
    yPosition += 5;
    pdf.setLineWidth(0.3);
    pdf.line(20, yPosition, pageWidth - 20, yPosition);
    yPosition += 8;

    // Totais
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');

    // Subtotal
    pdf.text('Subtotal:', pageWidth - 60, yPosition);
    pdf.text(`R$ ${orderData.subtotal.toFixed(2)}`, pageWidth - 25, yPosition, {
      align: 'right',
    });
    yPosition += 6;

    // Frete (sempre grátis por enquanto)
    pdf.text('Frete:', pageWidth - 60, yPosition);
    pdf.text('Grátis', pageWidth - 25, yPosition, { align: 'right' });
    yPosition += 6;

    // Linha do total
    pdf.setLineWidth(0.5);
    pdf.line(pageWidth - 80, yPosition, pageWidth - 20, yPosition);
    yPosition += 6;

    pdf.setFontSize(12);
    pdf.text('TOTAL:', pageWidth - 60, yPosition);
    pdf.text(
      `R$ ${orderData.totalValue.toFixed(2)}`,
      pageWidth - 25,
      yPosition,
      { align: 'right' }
    );

    // Observações
    if (orderData.notes) {
      yPosition += 20;

      // Verificar se precisa de nova página
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('OBSERVAÇÕES', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      const notesLines = pdf.splitTextToSize(orderData.notes, pageWidth - 40);
      notesLines.forEach((line: string) => {
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });
    }

    // Footer
    const footerY = pageHeight - 20;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text(
      'Este documento foi gerado automaticamente pelo sistema Rep-Vendas',
      pageWidth / 2,
      footerY,
      { align: 'center' }
    );
    pdf.text(
      `Data de geração: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
      pageWidth / 2,
      footerY + 5,
      { align: 'center' }
    );

    // Salvar o PDF
    const fileName = `Pedido_${orderData.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Não foi possível gerar o PDF do pedido');
  }
};

// Função auxiliar para converter método de pagamento
const getPaymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'boleto':
      return 'Boleto Bancário';
    case 'pix':
      return 'PIX';
    case 'cartao':
      return 'Cartão de Crédito';
    default:
      return method;
  }
};

// Função para gerar PDF a partir de um elemento HTML (opcional, para versões futuras)
export const generatePDFFromElement = async (
  elementId: string,
  fileName: string
): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Elemento não encontrado');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');

    const imgWidth = 210; // Largura A4 em mm
    const pageHeight = 295; // Altura A4 em mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(fileName);
  } catch (error) {
    console.error('Erro ao gerar PDF do elemento:', error);
    throw new Error('Não foi possível gerar o PDF');
  }
};
