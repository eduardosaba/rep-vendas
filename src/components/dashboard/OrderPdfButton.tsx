'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { generateOrderPDF } from '@/lib/generateOrderPDF';
import { toast } from 'sonner';

interface OrderPdfButtonProps {
  order: any;
  store: any;
}

export function OrderPdfButton({ order, store }: OrderPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      // 1. Normaliza dados do Cliente
      // Tenta pegar do cadastro (clients join) ou dos campos de visitante (guest)
      const clientData = Array.isArray(order.clients)
        ? order.clients[0]
        : order.clients;

      const customer = {
        name:
          clientData?.name || order.client_name_guest || 'Cliente Visitante',
        email: clientData?.email || order.client_email_guest,
        phone: clientData?.phone || order.client_phone_guest,

        // CORREÇÃO CRÍTICA:
        // Prioriza o campo 'client_cnpj_guest' da tabela orders, pois é onde o dado está sendo salvo.
        // Se estiver vazio, tenta o documento do cadastro ou o documento genérico.
        cnpj:
          order.client_cnpj_guest ||
          clientData?.document ||
          order.client_document_guest ||
          '',

        address: clientData?.address || order.client_address_guest,
      };

      // 2. Dados do Pedido
      const orderData = {
        id: order.display_id || order.id,
        created_at: order.created_at,
        customer: customer,
      };

      // 3. Normaliza Itens
      const items = order.order_items.map((item: any) => ({
        // Nome: Prioriza o nome do produto (join), se não tiver usa o nome gravado no item
        name: item.products?.name || item.product_name || 'Produto',
        quantity: item.quantity,
        price: item.unit_price,
        // Referência e Marca (indispensáveis para o layout novo)
        reference_code: item.products?.reference_code || item.product_reference,
        brand: item.products?.brand,
      }));

      // 4. Montagem do Rodapé (Correção do "Teste")
      // Aqui nós montamos manualmente os dados de contato para garantir que apareçam no rodapé
      // ignorando qualquer mensagem antiga salva no banco de dados.
      const contactParts = [];
      if (store?.name) contactParts.push(store.name);
      if (store?.email) contactParts.push(store.email);
      if (store?.phone) contactParts.push(store.phone);

      const customFooter =
        contactParts.length > 0
          ? contactParts.join('  •  ')
          : 'Obrigado pela preferência!';

      // 5. Configurações da Loja
      const storeData = {
        name: store?.name || 'Minha Loja',
        email: store?.email,
        phone: store?.phone,
        logo_url: store?.logo_url,
        primary_color: store?.primary_color,

        // Passamos o rodapé customizado aqui
        footer_message: customFooter,
      };

      // 6. Cálculo do Total
      // Se order.total_value estiver zerado por algum erro de banco, recalcula na hora
      const total =
        order.total_value ||
        items.reduce((acc: number, i: any) => acc + i.quantity * i.price, 0);

      // Chama o gerador
      await generateOrderPDF(orderData, storeData, items, total);

      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar PDF. Verifique o console.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isLoading}
      className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
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
