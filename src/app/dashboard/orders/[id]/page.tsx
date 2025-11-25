'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Order, Product } from '@/lib/types';
import { useToast } from '@/hooks/useToast';
import {
  ArrowLeft,
  Printer,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  CreditCard,
  FileText,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products: Product; // Join com a tabela products
}

interface OrderDetail extends Order {
  order_items: OrderItem[];
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      // Verificamos se o ID da URL é um número (ex: "1001") ou um UUID longo
      const isShortId = !isNaN(Number(params.id));

      let query = supabase.from('orders').select(`
          *,
          order_items (
            *,
            products (*)
          )
        `);

      if (isShortId) {
        // Se for número, busca pela coluna nova 'display_id'
        query = query.eq('display_id', params.id);
      } else {
        // Se for texto longo (UUID), busca pelo ID padrão (para compatibilidade)
        query = query.eq('id', params.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      setOrder(data);
    } catch (error) {
      console.error(error);
      addToast({ title: 'Pedido não encontrado', type: 'error' });
      router.push('/dashboard/orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) fetchOrderDetails();
  }, [params.id]);

  const updateStatus = async (newStatus: string) => {
    if (!order) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;

      setOrder({ ...order, status: newStatus as any });
      addToast({ title: `Status alterado para ${newStatus}`, type: 'success' });
    } catch (error) {
      addToast({ title: 'Erro ao atualizar', type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  if (loading)
    return (
      <div className="flex justify-center h-96 items-center">
        <Loader2 className="animate-spin text-indigo-600" />
      </div>
    );
  if (!order) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header de Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/orders"
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Pedido #{order.display_id}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider 
                ${
                  order.status === 'Completo'
                    ? 'bg-green-100 text-green-700'
                    : order.status === 'Cancelado'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {new Date(order.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            <Printer size={16} /> Imprimir
          </button>

          {/* Ações de Status */}
          {order.status === 'Pendente' && (
            <>
              <button
                onClick={() => updateStatus('Cancelado')}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm font-medium"
              >
                <XCircle size={16} /> Cancelar
              </button>
              <button
                onClick={() => updateStatus('Completo')}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium shadow-sm"
              >
                <CheckCircle size={16} /> Aprovar Pedido
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Itens */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Itens do Pedido</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {order.order_items.map((item) => (
                <div key={item.id} className="p-4 flex gap-4 items-center">
                  <div className="h-16 w-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {item.products?.image_url && (
                      <img
                        src={item.products.image_url}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {item.products?.name || 'Produto removido'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {item.products?.reference_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {item.quantity} x R$ {item.unit_price?.toFixed(2)}
                    </p>
                    <p className="font-medium text-gray-900">
                      R$ {item.total_price?.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <span className="font-medium text-gray-700">Total do Pedido</span>
              <span className="text-xl font-bold text-gray-900">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(order.total_value)}
              </span>
            </div>
          </div>

          {/* Observações */}
          {order.notes && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText size={18} className="text-gray-400" /> Observações
              </h3>
              <p className="text-gray-600 text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-100">
                {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Coluna Direita: Cliente e Detalhes */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={18} className="text-gray-400" /> Dados do Cliente
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">
                  Nome
                </p>
                <p className="text-gray-900 font-medium">
                  {order.client_name_guest || 'Cliente não identificado'}
                </p>
              </div>
              {order.company_name && (
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">
                    Empresa
                  </p>
                  <p className="text-gray-900">{order.company_name}</p>
                </div>
              )}
              {/* Aqui você pode adicionar email/telefone se salvar no banco */}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-gray-400" /> Entrega
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {order.delivery_address || 'Endereço não informado.'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-gray-400" /> Pagamento
            </h3>
            <p className="text-sm text-gray-900 font-medium capitalize">
              {order.payment_method || 'A combinar'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
