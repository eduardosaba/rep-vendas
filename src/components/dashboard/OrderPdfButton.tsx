'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { generateOrderPDF } from '@/utils/generateOrderPDF';
import { toast } from 'sonner';

interface OrderPdfButtonProps {
  order: any;
  store: any;
}

export function OrderPdfButton({ order, store }: OrderPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  // usar sonner diretamente

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const orderData = {
        id: order.display_id,
        customerName: order.client_name_guest,
        customerPhone: order.client_phone_guest,
        customerEmail: order.client_email_guest,

        // CORREÇÃO: Usando o campo correto do banco
        customerDocument: order.client_cnpj_guest,

        items: order.order_items.map((item: any) => ({
          reference_code: item.product_reference,
          name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price,
        })),
        total: order.total_value,
        date: new Date(order.created_at).toLocaleDateString('pt-BR'),
      };

      const storeData = {
        name: store?.name || 'Loja',
        phone: store?.phone || '',
        email: store?.email,
        logo_url: store?.logo_url,
        primary_color: store?.primary_color,
      };

      await generateOrderPDF(orderData, storeData);

      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isLoading}
      className="hidden sm:flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 bg-white shadow-sm"
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <FileText size={16} />
      )}
      Gerar PDF
    </button>
  );
}
