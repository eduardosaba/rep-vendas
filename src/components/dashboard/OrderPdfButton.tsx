'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { generateOrderPDF } from '@/lib/generateOrderPDF';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface OrderPdfButtonProps {
  order: any;
  store: any;
}

export function OrderPdfButton({ order, store }: OrderPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const resolveBrand = (item: any, byReference: Record<string, string>): string | null => {
    const raw =
      item?.products?.brand ||
      item?.products?.brand?.name ||
      item?.brand ||
      item?.product_brand ||
      byReference[String(item?.products?.reference_code || item?.product_reference || '').trim()] ||
      null;
    const normalized = String(raw || '').trim();
    if (!normalized) return null;
    if (normalized.toLowerCase() === 'sem marca') return null;
    return normalized;
  };

  const pdfName = `pedido-${order?.display_id || (order?.id || '').slice(0, 8)}.pdf`;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const noteText = String(order?.notes || '');
      const paymentTerms = (noteText.match(/Condição:\s*([^|]+)/i)?.[1] || '').trim();
      const signatureUrl = (noteText.match(/Assinatura:\s*(https?:\/\/\S+)/i)?.[1] || '').trim();

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

      // 3. Fallback de marca por referência (útil para pedidos salvos antigos)
      let byReference: Record<string, string> = {};
      try {
        const refs = Array.from(
          new Set(
            (order.order_items || [])
              .map((item: any) =>
                String(item?.products?.reference_code || item?.product_reference || '').trim()
              )
              .filter(Boolean)
          )
        );

        if (refs.length > 0 && store?.user_id) {
          const { data: productsByRef } = await supabase
            .from('products')
            .select('reference_code, brand')
            .eq('user_id', store.user_id)
            .in('reference_code', refs);

          byReference = (productsByRef || []).reduce((acc: Record<string, string>, p: any) => {
            const ref = String(p?.reference_code || '').trim();
            const brand = String(p?.brand || '').trim();
            if (ref && brand) acc[ref] = brand;
            return acc;
          }, {});
        }
      } catch {
        byReference = {};
      }

      // 4. Normaliza Itens
      const items = order.order_items.map((item: any) => ({
        // Nome: Prioriza o nome do produto (join), se não tiver usa o nome gravado no item
        name: item.products?.name || item.product_name || 'Produto',
        quantity: item.quantity,
        price: item.unit_price,
        // Referência e Marca (indispensáveis para o layout novo)
        reference_code: item.products?.reference_code || item.product_reference,
          brand: resolveBrand(item, byReference),
          // Imagens: incluímos campos que o gerador de PDF espera
          id: item.id,
          image_url: item.image_url || item.products?.image_url || null,
          external_image_url: item.external_image_url || item.products?.external_image_url || null,
          // Variants/optimized_variants podem vir do próprio item, do produto ou da galeria
          image_variants:
            (item as any).image_variants ||
            item.products?.image_variants ||
            null,
          optimized_variants:
            (item as any).optimized_variants ||
            item.products?.optimized_variants ||
            // some syncs store variants inside product_images entries
            (Array.isArray(item.products?.product_images) && item.products.product_images.length > 0
              ? item.products.product_images[0].optimized_variants || null
              : null),
          // keep full gallery if available (useful for fallback)
          product_images: item.products?.product_images || null,
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

      // Chama o gerador (admin/dashboard: garantir que mostre preços)
      await generateOrderPDF(orderData, storeData, items, total, false, true, {
        paymentTerms: paymentTerms || undefined,
        signatureUrl: signatureUrl || undefined,
        groupByBrand: true,
      });

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
      aria-label="Gerar PDF"
      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <FileText size={16} />
      )}
      <span className="sm:hidden text-xs truncate max-w-[8rem]">{pdfName}</span>
      <span className="hidden sm:inline">Gerar PDF</span>
    </button>
  );
}
