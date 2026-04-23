import { getAdminDashboardData } from '@/actions/admin-dashboard-actions';
import { OrdersTeamTable } from '@/components/admin/OrdersTeamTable';
import SalesChart from '@/components/admin/SalesChart';

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const res: any = await getAdminDashboardData();
  if (res?.error) {
    return <div className="p-8 text-red-500">Erro ao carregar dashboard: {res.error}</div>;
  }

  const orders = res.orders || [];
  const ranking = res.ranking || [];
  const statusCounts = res.statusCounts || {};

  return (
    <div className="p-8 space-y-10 bg-slate-50 min-h-screen">
      <header>
        <h1 className="text-3xl font-black italic text-slate-900">Visão Geral</h1>
        <p className="text-slate-500 font-medium italic">Acompanhe a performance da sua distribuidora em tempo real.</p>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesChart data={ranking} />
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100">
          <h3 className="font-black mb-4">Status dos Pedidos</h3>
          <ul className="space-y-2">
            {Object.keys(statusCounts).map((k) => (
              <li key={k} className="flex justify-between">
                <span className="text-sm text-slate-700">{k}</span>
                <strong className="font-black">{statusCounts[k]}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black italic text-slate-900 ml-4">Últimos Pedidos da Equipe</h2>
        {/* OrdersTeamTable is a client component; hydrate with server data */}
        <OrdersTeamTable orders={orders} />
      </section>
    </div>
  );
}
