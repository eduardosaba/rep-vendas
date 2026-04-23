import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCustomerById } from '../actions';

interface Props {
  params: { id: string };
}

export default async function Page({ params }: Props) {
  const res = await getCustomerById(params.id);
  if (!res.success) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold">Cliente</h1>
        <p className="text-red-600">Erro ao carregar cliente: {String(res.error)}</p>
      </div>
    );
  }

  const customer = res.data;
  const orders = (customer?.orders as any[]) || [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/customers" className="text-slate-500 hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar
        </Link>
        <h1 className="text-2xl font-black">Ficha: {customer?.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border">
          <h3 className="font-bold mb-2">Dados</h3>
          <div className="text-sm text-slate-700 space-y-1">
            <div><strong>CNPJ:</strong> {customer?.document || '—'}</div>
            <div><strong>Telefone:</strong> {customer?.phone || '—'}</div>
            <div><strong>Email:</strong> {customer?.email || '—'}</div>
            <div><strong>Empresa:</strong> {customer?.company?.name || '—'}</div>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-6 rounded-2xl border">
          <h3 className="font-bold mb-4">Histórico de Pedidos ({orders.length})</h3>
          {orders.length === 0 ? (
            <div className="text-sm text-slate-500">Nenhum pedido registrado para este cliente.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Pedido</th>
                    <th className="p-3">Data</th>
                    <th className="p-3">Valor</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold">#{o.display_id || o.id}</td>
                      <td className="p-3">{new Date(o.created_at).toLocaleString()}</td>
                      <td className="p-3">R$ {o.total_value}</td>
                      <td className="p-3">{o.status}</td>
                      <td className="p-3 text-right">
                        <Link href={`/admin/companies/${o.company_id}/orders`} className="text-indigo-600 hover:underline">Ver na Torre</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
