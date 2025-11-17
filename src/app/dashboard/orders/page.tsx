"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Edit,
  Save,
  X,
} from "lucide-react";

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_value: number;
  order_type: string;
  delivery_address?: string;
  payment_method?: string;
  notes?: string;
  tracking_code?: string;
  estimated_delivery?: string;
  actual_delivery?: string;
  notification_sent?: boolean;
  clients?: {
    name: string;
    email?: string;
    phone?: string;
  };
  order_items: Array<{
    quantity: number;
    unit_price: number;
    total_price: number;
    products: {
      name: string;
      brand?: string;
    };
  }>;
}

interface Settings {
  primary_color?: string;
}

export default function OrdersManagement() {
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Order>>({});
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      } else {
        setUser(user);
        loadOrders(user.id);
        loadSettings();
      }
    };
    getUser();
  }, [router]);

  const loadSettings = async () => {
    const { data: sets } = await supabase
      .from("settings")
      .select("primary_color")
      .limit(1);
    if (sets && sets.length > 0) {
      setSettings(sets[0]);
    }
  };

  const loadOrders = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          clients (name, email, phone),
          order_items (
            quantity,
            unit_price,
            total_price,
            products (name, brand)
          )
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pendente":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "Confirmado":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "Em Preparação":
        return <Package className="h-4 w-4 text-orange-500" />;
      case "Enviado":
        return <Truck className="h-4 w-4 text-purple-500" />;
      case "Entregue":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "Cancelado":
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pendente":
        return "bg-yellow-100 text-yellow-800";
      case "Confirmado":
        return "bg-blue-100 text-blue-800";
      case "Em Preparação":
        return "bg-orange-100 text-orange-800";
      case "Enviado":
        return "bg-purple-100 text-purple-800";
      case "Entregue":
        return "bg-green-100 text-green-800";
      case "Cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchTerm === "" ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_items?.some((item) =>
        item.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesStatus = statusFilter === "" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEditStart = (order: Order) => {
    setEditingOrder(order.id);
    setEditData({
      status: order.status,
      tracking_code: order.tracking_code || "",
      estimated_delivery: order.estimated_delivery || "",
      notes: order.notes || "",
    });
  };

  const handleEditSave = async () => {
    if (!editingOrder || !user) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: editData.status,
          tracking_code: editData.tracking_code,
          estimated_delivery: editData.estimated_delivery,
          notes: editData.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingOrder)
        .eq("user_id", user.id);

      if (error) throw error;

      // Recarregar pedidos
      loadOrders(user.id);
      setEditingOrder(null);
      setEditData({});

      // Criar notificação se o status mudou para algo importante
      if (editData.status === "Enviado" || editData.status === "Entregue") {
        try {
          await fetch("/api/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: user.id,
              title: `Pedido Atualizado`,
              message: `Status do pedido #${editingOrder.slice(-8).toUpperCase()} alterado para ${editData.status}`,
              type: "info",
              data: {
                orderId: editingOrder,
                newStatus: editData.status,
                trackingCode: editData.tracking_code,
              },
            }),
          });
        } catch (notificationError) {
          console.error("Erro ao criar notificação:", notificationError);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      alert("Erro ao atualizar pedido");
    }
  };

  const handleEditCancel = () => {
    setEditingOrder(null);
    setEditData({});
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar ao Dashboard
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Gerenciamento de Pedidos
                </h1>
                <p className="text-gray-600">
                  {filteredOrders.length} pedidos encontrados
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="ID do pedido, cliente ou produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <div className="relative">
                <Filter className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="">Todos os status</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Confirmado">Confirmado</option>
                  <option value="Em Preparação">Em Preparação</option>
                  <option value="Enviado">Enviado</option>
                  <option value="Entregue">Entregue</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                }}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded hover:bg-gray-200"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(order.status)}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Pedido #{order.id.slice(-8).toUpperCase()}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")}{" "}
                      às{" "}
                      {new Date(order.created_at).toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {order.total_value?.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {order.order_items?.length || 0} itens
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </h4>
                  <p className="text-sm text-gray-900">
                    {order.clients?.name || "Cliente não informado"}
                  </p>
                  {order.clients?.email && (
                    <p className="text-sm text-gray-600">
                      {order.clients.email}
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </h4>
                  <p className="text-sm text-gray-900 capitalize">
                    {order.order_type === "catalog"
                      ? "Catálogo"
                      : order.order_type === "quick_brand"
                        ? "Pedido Rápido"
                        : order.order_type}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    Pagamento
                  </h4>
                  <p className="text-sm text-gray-900 capitalize">
                    {order.payment_method === "boleto"
                      ? "Boleto"
                      : order.payment_method === "pix"
                        ? "PIX"
                        : order.payment_method === "cartao"
                          ? "Cartão"
                          : order.payment_method || "Não informado"}
                  </p>
                </div>
              </div>

              {order.delivery_address && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">
                    Endereço de Entrega
                  </h4>
                  <p className="text-sm text-gray-900">
                    {order.delivery_address}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Itens do Pedido
                </h4>
                <div className="space-y-2">
                  {order.order_items?.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>
                        {item.products?.name}{" "}
                        {item.products?.brand ? `(${item.products.brand})` : ""}
                      </span>
                      <span>
                        {item.quantity}x R$ {item.unit_price?.toFixed(2)} = R${" "}
                        {item.total_price?.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit Mode */}
              {editingOrder === order.id ? (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Editar Pedido
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={editData.status || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            status: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Confirmado">Confirmado</option>
                        <option value="Em Preparação">Em Preparação</option>
                        <option value="Enviado">Enviado</option>
                        <option value="Entregue">Entregue</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Código de Rastreamento
                      </label>
                      <input
                        type="text"
                        value={editData.tracking_code || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            tracking_code: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded px-3 py-2"
                        placeholder="Ex: BR123456789BR"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Data Estimada de Entrega
                      </label>
                      <input
                        type="date"
                        value={editData.estimated_delivery || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            estimated_delivery: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observações
                      </label>
                      <textarea
                        value={editData.notes || ""}
                        onChange={(e) =>
                          setEditData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        className="w-full border border-gray-300 rounded px-3 py-2 h-20"
                        placeholder="Observações sobre o pedido..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={handleEditCancel}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleEditSave}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                      style={{
                        backgroundColor: settings?.primary_color || "#3B82F6",
                      }}
                    >
                      <Save className="h-4 w-4 mr-1 inline" />
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      {order.tracking_code && (
                        <p className="text-sm text-gray-600">
                          <strong>Rastreamento:</strong> {order.tracking_code}
                        </p>
                      )}
                      {order.estimated_delivery && (
                        <p className="text-sm text-gray-600">
                          <strong>Entrega Estimada:</strong>{" "}
                          {new Date(
                            order.estimated_delivery,
                          ).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      {order.notes && (
                        <p className="text-sm text-gray-600">
                          <strong>Observações:</strong> {order.notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleEditStart(order)}
                      className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Nenhum pedido encontrado
            </h3>
            <p className="text-gray-600">
              {orders.length === 0
                ? "Você ainda não tem pedidos."
                : "Tente ajustar os filtros de busca."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
