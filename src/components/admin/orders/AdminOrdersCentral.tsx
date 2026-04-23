'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  Download,
  MoreHorizontal,
  User,
  RefreshCcw,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import OrderDetailModal from './OrderDetailModal';

type OrderRow = {
  id: string;
  display_id?: number | null;
  created_at: string;
  status: string;
  total_value: number;
  faturado_at?: string | null;
  despachado_at?: string | null;
  entregue_at?: string | null;
  customer_name?: string | null;
  customer_city?: string | null;
  rep_name?: string | null;
  seller_id?: string | null;
};

type OrderDetail = {
  id: string;
  display_id?: number | null;
  status: string;
  customer_name?: string | null;
  customer_cnpj?: string | null;
  customer_city?: string | null;
  seller_name?: string | null;
  commission_value?: number;
  total_value?: number;
  signature_url?: string | null;
  tracking_code?: string | null;
  pdf_url?: string | null;
  tracking_history?: Array<{
    id: string;
    tracking_code: string | null;
    status_note: string | null;
    created_at: string;
  }>;
  items: Array<{
    id: string;
    name: string;
    brand?: string | null;
    quantity: number;
    total_price: number;
    image_url?: string | null;
  }>;
};

function money(v?: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(v || 0));
}

function formatDate(input?: string) {
  if (!input) return '-';
  const d = new Date(input);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadge(status?: string) {
  const s = String(status || '').toLowerCase();
  if (s.includes('aguardando'))
    return 'bg-amber-100 text-amber-700';
  if (s.includes('confirmado') || s.includes('faturado'))
    return 'bg-emerald-100 text-emerald-700';
  if (s.includes('enviado') || s.includes('despachado'))
    return 'bg-blue-100 text-blue-700';
  if (s.includes('cancelado'))
    return 'bg-rose-100 text-rose-700';
  return 'bg-slate-100 text-slate-700';
}

function formatDuration(hours: number) {
  if (!Number.isFinite(hours) || hours < 0) return '-';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return `${days}d ${rem}h`;
}

function calcSla(order: OrderRow) {
  const start = new Date(order.created_at).getTime();
  if (!Number.isFinite(start)) return '-';

  const status = String(order.status || '').toLowerCase();
  let endTs = Date.now();

  if ((status.includes('confirmado') || status.includes('faturado')) && order.faturado_at) {
    endTs = new Date(order.faturado_at).getTime();
  } else if ((status.includes('enviado') || status.includes('despachado')) && order.despachado_at) {
    endTs = new Date(order.despachado_at).getTime();
  } else if (status.includes('entregue') && order.entregue_at) {
    endTs = new Date(order.entregue_at).getTime();
  }

  const hours = (endTs - start) / (1000 * 60 * 60);
  return formatDuration(hours);
}

export default function AdminOrdersCentral({ initialOrders }: { initialOrders: OrderRow[] }) {
  const [orders, setOrders] = useState<OrderRow[]>(initialOrders || []);
  const [search, setSearch] = useState('');
  const [repFilter, setRepFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reps = useMemo(() => {
    const unique = new Set<string>();
    (orders || []).forEach((o) => {
      if (o.rep_name) unique.add(o.rep_name);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (orders || []).filter((o) => {
      if (repFilter !== 'all' && (o.rep_name || '-') !== repFilter) return false;
      if (statusFilter !== 'all' && (o.status || '') !== statusFilter) return false;

      if (!q) return true;
      const bucket = [
        String(o.display_id || ''),
        String(o.customer_name || ''),
        String(o.rep_name || ''),
      ]
        .join(' ')
        .toLowerCase();
      return bucket.includes(q);
    });
  }, [orders, search, repFilter, statusFilter]);

  const statuses = useMemo(() => {
    const unique = new Set<string>();
    (orders || []).forEach((o) => {
      if (o.status) unique.add(o.status);
    });
    return Array.from(unique);
  }, [orders]);

  const openOrder = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setModalOpen(true);
    setLoadingDetail(true);
    setDetail(null);

    try {
      const res = await fetch(`/api/company/orders?orderId=${encodeURIComponent(orderId)}`);
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Falha ao carregar ficha do pedido');
      }
      setDetail(json.data as OrderDetail);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar pedido');
    } finally {
      setLoadingDetail(false);
    }
  };

  const runAction = async (
    action: 'faturado' | 'despachado' | 'generate_pdf' | 'update_tracking',
    trackingCode?: string | null
  ) => {
    if (!selectedOrderId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/company/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: selectedOrderId, action, trackingCode }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Ação não concluída');
      }

      if (action === 'generate_pdf' && json?.data?.url) {
        window.open(String(json.data.url), '_blank');
      }

      if (action === 'faturado') {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrderId
              ? { ...o, status: 'Confirmado' }
              : o
          )
        );
      }

      if (action === 'despachado') {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrderId
              ? {
                  ...o,
                  status: 'Enviado',
                  despachado_at: new Date().toISOString(),
                }
              : o
          )
        );
      }

      await openOrder(selectedOrderId);
      toast.success('Ação aplicada com sucesso');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao processar ação');
    } finally {
      setSubmitting(false);
    }
  };

  const exportCsv = () => {
    const rows = filtered.map((o) => [
      o.display_id || '',
      formatDate(o.created_at),
      o.customer_name || '',
      o.customer_city || '',
      o.rep_name || '',
      o.status || '',
      Number(o.total_value || 0).toFixed(2),
    ]);

    const header = [
      'pedido',
      'data',
      'cliente',
      'cidade',
      'representante',
      'status',
      'total',
    ];

    const csv = [header, ...rows]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pedidos-central-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black italic text-slate-900">Central de Pedidos</h1>
          <p className="text-slate-500 font-medium">
            Gestão de vendas de toda a rede de representantes
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportCsv}
            className="h-12 px-4 bg-white border rounded-xl font-bold text-sm text-slate-600 flex items-center gap-2 hover:bg-slate-50"
          >
            <Download size={18} /> Planilha
          </button>
          <Link
            href="/dashboard/products/sync"
            className="h-12 px-4 bg-white border rounded-xl font-bold text-sm text-slate-600 flex items-center gap-2 hover:bg-slate-50"
          >
            <RefreshCcw size={18} /> Conciliar com Planilha
          </Link>
          <Link
            href="/dashboard/orders/new"
            className="h-12 px-6 bg-[var(--primary,#2563eb)] text-white rounded-xl font-black text-sm shadow-lg shadow-primary/20 inline-flex items-center"
          >
            Novo Pedido Manual
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-2 rounded-2xl border flex items-center px-4 gap-2 md:col-span-2">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente ou pedido..."
            className="border-none focus:ring-0 text-sm w-full outline-none"
          />
        </div>

        <select
          value={repFilter}
          onChange={(e) => setRepFilter(e.target.value)}
          className="bg-white p-2 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600"
        >
          <option value="all">Todos os Representantes</option>
          {reps.map((rep) => (
            <option key={rep} value={rep}>
              {rep}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white p-2 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600"
        >
          <option value="all">Todos os Status</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left min-w-[920px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Pedido / Data</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Cliente</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Representante</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">Total</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">Status</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">SLA</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm">
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-black text-slate-800">#{o.display_id || o.id.slice(-6)}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(o.created_at)}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-700">{o.customer_name || '-'}</p>
                  <p className="text-[10px] text-slate-500 italic">{o.customer_city || '-'}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                      <User size={14} />
                    </div>
                    <span className="font-medium text-slate-600">{o.rep_name || '-'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 font-black text-slate-900">{money(o.total_value || 0)}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">
                    <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${statusBadge(o.status)}`}>
                      {o.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-xs font-bold text-slate-600">{calcSla(o)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => openOrder(o.id)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </td>
              </tr>
            ))}

            {filtered.length === 0 ? (
              <tr>
                <td className="px-6 py-10 text-center text-slate-500" colSpan={7}>
                  Nenhum pedido encontrado para os filtros aplicados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <OrderDetailModal
        open={modalOpen}
        order={detail}
        loading={loadingDetail}
        submitting={submitting}
        onClose={() => {
          setModalOpen(false);
          setSelectedOrderId(null);
          setDetail(null);
        }}
        onStatusUpdate={(action, trackingCode) => runAction(action, trackingCode)}
        onGeneratePdf={() => runAction('generate_pdf')}
      />
    </div>
  );
}
