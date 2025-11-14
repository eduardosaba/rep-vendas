interface Order {
  id: string
  client: string
  total: string
  status: string
  type?: string
  date: string
  items?: number
}

interface RecentOrdersTableProps {
  orders: Order[]
}

export default function RecentOrdersTable({ orders = [] }: RecentOrdersTableProps) {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Pedidos Recentes</h3>
      </div>
      <ul className="divide-y divide-gray-200">
        {orders.map((order) => (
          <li key={order.id}>
            <div className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">{order.client[0]}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{order.client}</div>
                    <div className="text-sm text-gray-500">
                      {order.date} • {order.type || 'Pedido'} • {order.items || 0} itens
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="text-sm text-gray-900 mr-4">{order.total}</div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'Completo' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}