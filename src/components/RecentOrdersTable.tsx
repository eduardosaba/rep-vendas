interface Order {
  id: string;
  client: string;
  total: string;
  status: string;
  type?: string;
  date: string;
  items?: number;
}

interface RecentOrdersTableProps {
  orders: Order[];
}

export default function RecentOrdersTable({
  orders = [],
}: RecentOrdersTableProps) {
  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Pedidos Recentes
        </h3>
      </div>
      <ul className="divide-y divide-gray-200">
        {orders.map((order) => (
          <li key={order.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex-shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                      <span className="text-sm font-medium text-gray-700">
                        {order.client[0]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {order.client}
                    </div>
                    <div className="text-sm text-gray-500">
                      {order.date} • {order.type || 'Pedido'} •{' '}
                      {order.items || 0} itens
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="mr-4 text-sm text-gray-900">
                    {order.total}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      order.status === 'Completo'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
