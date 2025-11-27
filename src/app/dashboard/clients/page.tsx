import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { User, Phone, ShoppingBag, Calendar } from 'lucide-react';

interface ClientSummary {
  name: string;
  phone: string;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: string;
}

export default async function ClientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: orders } = await supabase
    .from('orders')
    .select('client_name_guest, client_phone_guest, total_value, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const clientsMap = new Map<string, ClientSummary>();

  (orders || []).forEach((order) => {
    // PROTEÇÃO CRÍTICA: Garante que nunca seja null antes de manipular
    const rawPhone = order.client_phone_guest || '';

    // Se não tiver telefone, usamos o nome como chave única (fallback)
    // Se tiver telefone, removemos tudo que não é número para padronizar
    const key = rawPhone
      ? rawPhone.replace(/\D/g, '')
      : `nomatch-${order.client_name_guest}`;

    if (!clientsMap.has(key)) {
      clientsMap.set(key, {
        name: order.client_name_guest || 'Cliente Sem Nome',
        phone: order.client_phone_guest || '',
        totalSpent: 0,
        orderCount: 0,
        lastOrderDate: order.created_at,
      });
    }

    const client = clientsMap.get(key)!;
    client.totalSpent += Number(order.total_value);
    client.orderCount += 1;

    // Como a query já vem ordenada por data desc, a primeira vez que encontramos o cliente
    // é a data mais recente. Não precisamos atualizar se já existir.
  });

  const clients = Array.from(clientsMap.values()).sort(
    (a, b) => b.totalSpent - a.totalSpent
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Carteira de Clientes
          </h1>
          <p className="text-sm text-gray-500">
            {clients.length} clientes identificados através do histórico de
            pedidos.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Contato</th>
                <th className="px-6 py-4 font-medium">Total Gasto</th>
                <th className="px-6 py-4 font-medium">Pedidos</th>
                <th className="px-6 py-4 font-medium">Última Compra</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <User size={48} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-lg font-medium">Nenhum cliente ainda</p>
                    <p className="text-sm">
                      Compartilhe seu catálogo para receber pedidos.
                    </p>
                  </td>
                </tr>
              ) : (
                clients.map((client, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm uppercase">
                          {client.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">
                          {client.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        {client.phone || (
                          <span className="text-gray-400 italic">Não inf.</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-green-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(client.totalSpent)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-600">
                        <ShoppingBag size={12} />
                        {client.orderCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        {new Date(client.lastOrderDate).toLocaleDateString(
                          'pt-BR'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {client.phone ? (
                        <a
                          href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium hover:underline"
                        >
                          WhatsApp
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs cursor-not-allowed">
                          Sem contato
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
