'use client';

import { useState } from 'react';
import { FileText, Loader2, RotateCcw } from 'lucide-react';
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

  const isMissingPdf = !order?.pdf_url;
  const buttonLabel = isMissingPdf ? 'Gerar PDF novamente' : 'Gerar PDF';

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
      const clientData = Array.isArray(order.clients) ? order.clients[0] : order.clients;

      const customer = {
        name: clientData?.name || order.client_name_guest || 'Cliente Visitante',
        email: clientData?.email || order.client_email_guest,
        phone: clientData?.phone || order.client_phone_guest,
        cnpj: order.client_cnpj_guest || clientData?.document || order.client_document_guest || '',
        address: clientData?.address || order.client_address_guest,
      };

      // 2. Dados do Pedido
      const orderData = {
        id: order.display_id || order.id,
        created_at: order.created_at,
        customer: customer,
      };

      // 3. Fallback de marca por referência
      let byReference: Record<string, string> = {};
      try {
        const refs = Array.from(
          new Set(
            (order.order_items || [])
              .map((item: any) => String(item?.products?.reference_code || item?.product_reference || '').trim())
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
      const items = (order.order_items || []).map((item: any) => ({
        name: item.products?.name || item.product_name || 'Produto',
        quantity: item.quantity,
        price: item.unit_price,
        reference_code: item.products?.reference_code || item.product_reference,
        brand: resolveBrand(item, byReference),
        id: item.id,
        image_url: item.image_url || item.products?.image_url || null,
        external_image_url: item.external_image_url || item.products?.external_image_url || null,
        image_variants: (item as any).image_variants || item.products?.image_variants || null,
        optimized_variants:
          (item as any).optimized_variants ||
          item.products?.optimized_variants ||
          (Array.isArray(item.products?.product_images) && item.products.product_images.length > 0
            ? item.products.product_images[0].optimized_variants || null
            : null),
        product_images: item.products?.product_images || null,
      }));

      // 5. Montagem do Rodapé
      const contactParts = [];
      if (store?.name) contactParts.push(store.name);
      if (store?.email) contactParts.push(store.email);
      if (store?.phone) contactParts.push(store.phone);

      const customFooter = contactParts.length > 0 ? contactParts.join('  •  ') : 'Obrigado pela preferência!';

      const storeData = {
        name: store?.name || 'Minha Loja',
        email: store?.email,
        phone: store?.phone,
        logo_url: store?.logo_url,
        primary_color: store?.primary_color,
        footer_message: customFooter,
      };

      const total = order.total_value || items.reduce((acc: number, i: any) => acc + i.quantity * i.price, 0);

      // Regenera PDF via pdfMake / gerador de PDF
      const pdfBuffer = await generateOrderPDF(orderData, storeData, items, total, true, true, {
        paymentTerms: paymentTerms || undefined,
        signatureUrl: signatureUrl || undefined,
        groupByBrand: true,
      });

      // Se o pdf_url estava nulo/ausente, faz upload do novo PDF para o bucket 'orders'
      if (order?.id && pdfBuffer) {
        try {
          const uploadRes = await fetch(`/api/upload-order-pdf?orderId=${order.id}`, {
            method: 'POST',
            body: pdfBuffer,
          });

          const uploadJson = await uploadRes.json();
          if (uploadRes.ok && uploadJson.publicUrl) {
            order.pdf_url = uploadJson.publicUrl;
          }
        } catch (upErr) {
          console.warn('Erro ao atualizar pdf_url no servidor:', upErr);
        }
      }

      toast.success(isMissingPdf ? 'PDF gerado e sincronizado com sucesso!' : 'PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Verifique o console.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isLoading}
      aria-label={buttonLabel}
      className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isMissingPdf ? (
        <RotateCcw size={16} className="text-amber-600" />
      ) : (
        <FileText size={16} />
      )}
      <span className="sm:hidden text-xs truncate max-w-[8rem]">{pdfName}</span>
      <span className="hidden sm:inline">{buttonLabel}</span>
    </button>
  );
}
