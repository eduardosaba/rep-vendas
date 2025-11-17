"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import { useCatalog } from "../../../../hooks/useCatalog";
import { generateOrderPDF, OrderData } from "../../../../lib/pdfGenerator";
import {
  ShoppingCart,
  CheckCircle,
  Shield,
  Clock,
  ArrowLeft,
  User,
  MapPin,
  CreditCard,
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  X,
  Plus,
  Minus,
  Trash2,
  Lock,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  brand?: string;
  reference_code?: string;
  description?: string;
  price: number;
  image_url?: string;
}

interface Settings {
  id?: string;
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  banner_url?: string;
  primary_color?: string;
  secondary_color?: string;
  header_color?: string;
  font_family?: string;
  title_color?: string;
  icon_color?: string;
  show_delivery_address?: boolean;
  show_installments?: boolean;
  show_installments_checkout?: boolean;
  show_discount?: boolean;
  show_old_price?: boolean;
  show_filter_price?: boolean;
  show_filter_category?: boolean;
  show_filter_bestseller?: boolean;
  show_filter_new?: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function Checkout() {
  const params = useParams();
  const userId = params.userId as string;
  const router = useRouter();
  const { settings, cart, secureCheckout, formatPrice, priceAccessGranted, checkPriceAccess } = useCatalog();

  // Estados locais
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [completed, setCompleted] = useState(false);
  const [completedOrderData, setCompletedOrderData] = useState<OrderData | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    delivery_address: "",
    payment_method: "boleto",
    notes: "",
  });

  useEffect(() => {
    if (userId) {
      loadInitialData();
    }
  }, [userId]);

  useEffect(() => {
    if (Object.keys(cart).length > 0) {
      loadCartItems();
    } else {
      setCartItems([]);
      setLoading(false);
    }
  }, [cart]);

  // Auto-save do rascunho
  useEffect(() => {
    if (autoSaveEnabled && formData.client_name && cartItems.length > 0) {
      const draftOrder = {
        clientData: {
          name: formData.client_name,
          email: formData.client_email,
          phone: formData.client_phone,
          address: formData.delivery_address,
        },
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        paymentMethod: formData.payment_method,
        notes: formData.notes,
      };

      secureCheckout.saveDraftOrder(draftOrder);
    }
  }, [formData, cartItems, autoSaveEnabled, secureCheckout]);

  const loadInitialData = async () => {
    try {
      // Validar sessão de checkout seguro
      const isValidSession = await secureCheckout.validateSession();
      if (!isValidSession) {
        router.push(`/login?redirect=/catalog/${userId}/checkout`);
        return;
      }

      // Tentar carregar rascunho salvo
      const draftOrder = secureCheckout.loadDraftOrder();
      if (draftOrder) {
        setFormData({
          client_name: draftOrder.clientData.name || "",
          client_email: draftOrder.clientData.email || "",
          client_phone: draftOrder.clientData.phone || "",
          delivery_address: draftOrder.clientData.address || "",
          payment_method: draftOrder.paymentMethod || "boleto",
          notes: draftOrder.notes || "",
        });
      }

      await loadClients();
    } catch (error) {
      console.error("Erro ao carregar dados iniciais:", error);
    }
  };

  const loadCartItems = async () => {
    const productIds = Object.keys(cart);
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (products) {
      const items: CartItem[] = products.map((product) => ({
        product,
        quantity: cart[product.id] || 0,
      }));
      setCartItems(items);
    }
    setLoading(false);
  };

  const loadClients = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: clientsData } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("name");

      setClients(clientsData || []);
    }
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setFormData((prev) => ({
        ...prev,
        client_name: client.name,
        client_email: client.email || "",
        client_phone: client.phone || "",
        delivery_address: client.address || "",
      }));
    }
  };

  const getTotalValue = () => {
    return cartItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0,
    );
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const handleGeneratePDF = async () => {
    if (!completedOrderData) return;

    setGeneratingPDF(true);
    try {
      await generateOrderPDF(completedOrderData);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar PDF. Tente novamente.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleReauth = async () => {
    if (!authPassword.trim()) {
      alert('Digite sua senha');
      return;
    }

    setAuthLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        alert('Usuário não encontrado. Faça login novamente.');
        router.push(`/login?redirect=/catalog/${userId}/checkout`);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: authPassword,
      });

      if (signInError) {
        alert('Senha incorreta. Tente novamente.');
        return;
      }

      // Atualizar estado de autenticação
      await secureCheckout.validateSession();
      setShowAuthModal(false);
      setAuthPassword("");
      setShowAuthPassword(false);

    } catch (error) {
      console.error('Erro na reautenticação:', error);
      alert('Erro ao verificar senha. Tente novamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const updateCartItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeCartItem(productId);
      return;
    }

    const newCart = { ...cart };
    newCart[productId] = newQuantity;
    localStorage.setItem("cart", JSON.stringify(newCart));

    // Atualizar estado local
    const updatedItems = cartItems.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    );
    setCartItems(updatedItems);
  };

  const removeCartItem = (productId: string) => {
    const newCart = { ...cart };
    delete newCart[productId];
    localStorage.setItem("cart", JSON.stringify(newCart));

    // Atualizar estado local
    const updatedItems = cartItems.filter(item => item.product.id !== productId);
    setCartItems(updatedItems);
  };

  const shouldShowPrices = () => {
    // Se não há proteção de preços configurada, mostrar sempre
    if (!settings?.price_access_password) return true;

    // Verificar se o acesso foi concedido
    return priceAccessGranted && checkPriceAccess();
  };

  const createNotification = async (orderId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          title: "Novo Pedido Recebido",
          message: `Pedido #${orderId.slice(-8).toUpperCase()} foi criado com sucesso. Valor: R$ ${getTotalValue().toFixed(2)}`,
          type: "success",
          data: {
            orderId: orderId,
            orderNumber: orderId.slice(-8).toUpperCase(),
            totalValue: getTotalValue(),
            clientName: formData.client_name,
          },
        }),
      });
    } catch (notificationError) {
      console.error("Erro ao criar notificação:", notificationError);
    }
  };

  const sendOrderEmail = async (orderId: string) => {
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333; text-align: center;">Pedido Recebido!</h1>
          <p>Olá ${formData.client_name},</p>
          <p>Seu pedido foi recebido com sucesso e está sendo processado.</p>

          <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Detalhes do Pedido:</h3>
            <p><strong>Número do Pedido:</strong> #${orderId.slice(-8).toUpperCase()}</p>
            <p><strong>Data:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
            <p><strong>Valor Total:</strong> R$ ${getTotalValue().toFixed(2)}</p>
            <p><strong>Forma de Pagamento:</strong> ${formData.payment_method === "boleto" ? "Boleto Bancário" : formData.payment_method === "pix" ? "PIX" : "Cartão de Crédito"}</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3>Itens do Pedido:</h3>
            ${cartItems
              .map(
                (item) => `
              <div style="border-bottom: 1px solid #dee2e6; padding: 10px 0;">
                <p><strong>${item.product.name}</strong></p>
                <p>Quantidade: ${item.quantity} | Preço: R$ ${item.product.price.toFixed(2)} | Total: R$ ${(item.product.price * item.quantity).toFixed(2)}</p>
              </div>
            `,
              )
              .join("")}
          </div>

          ${
            settings?.show_delivery_address
              ? `
            <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3>Endereço de Entrega:</h3>
              <p>${formData.delivery_address}</p>
            </div>
          `
              : ""
          }

          ${
            formData.notes
              ? `
            <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3>Observações:</h3>
              <p>${formData.notes}</p>
            </div>
          `
              : ""
          }

          <p>Em breve entraremos em contato para confirmar os detalhes do pedido.</p>
          <p>Atenciosamente,<br>Equipe ${settings?.name || "Rep-Vendas"}</p>
        </div>
      `;

      const emailText = `
        Pedido Recebido!

        Olá ${formData.client_name},

        Seu pedido foi recebido com sucesso e está sendo processado.

        Detalhes do Pedido:
        Número do Pedido: #${orderId.slice(-8).toUpperCase()}
        Data: ${new Date().toLocaleDateString("pt-BR")}
        Valor Total: R$ ${getTotalValue().toFixed(2)}
        Forma de Pagamento: ${formData.payment_method === "boleto" ? "Boleto Bancário" : formData.payment_method === "pix" ? "PIX" : "Cartão de Crédito"}

        Itens do Pedido:
        ${cartItems.map((item) => `- ${item.product.name} (Qtd: ${item.quantity}) - R$ ${(item.product.price * item.quantity).toFixed(2)}`).join("\n")}

        ${
          settings?.show_delivery_address
            ? `Endereço de Entrega:
        ${formData.delivery_address}`
            : ""
        }

        ${formData.notes ? `Observações: ${formData.notes}` : ""}

        Em breve entraremos em contato para confirmar os detalhes do pedido.

        Atenciosamente,
        Equipe ${settings?.name || "Rep-Vendas"}
      `;

      await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: formData.client_email,
          subject: `Pedido #${orderId.slice(-8).toUpperCase()} - ${settings?.name || "Rep-Vendas"}`,
          html: emailHtml,
          text: emailText,
          userId: userId,
        }),
      });
    } catch (emailError) {
      console.error("Erro ao enviar email:", emailError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Preparar dados do pedido
      const orderData = {
        userId,
        clientId: selectedClient,
        clientData: {
          name: formData.client_name,
          email: formData.client_email,
          phone: formData.client_phone,
          address: formData.delivery_address,
        },
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
        })),
        totalValue: getTotalValue(),
        deliveryAddress: formData.delivery_address,
        paymentMethod: formData.payment_method,
        notes: formData.notes,
      };

      // Usar o sistema de checkout seguro para submeter
      const result = await secureCheckout.submitOrder(orderData);

      if (result.success && result.orderId) {
        // Preparar dados para o PDF
        const orderDataForPDF: OrderData = {
          id: result.orderId,
          orderNumber: result.orderId.slice(-8).toUpperCase(),
          createdAt: new Date().toLocaleDateString('pt-BR'),
          clientName: formData.client_name,
          clientEmail: formData.client_email,
          clientPhone: formData.client_phone,
          deliveryAddress: formData.delivery_address,
          paymentMethod: formData.payment_method,
          notes: formData.notes,
          items: cartItems.map(item => ({
            name: item.product.name,
            brand: item.product.brand,
            quantity: item.quantity,
            unitPrice: item.product.price,
            totalPrice: item.product.price * item.quantity,
          })),
          subtotal: getTotalValue(),
          totalValue: getTotalValue(),
          settings,
        };

        setCompletedOrderData(orderDataForPDF);

        // Limpar carrinho e rascunho
        localStorage.removeItem("cart");
        secureCheckout.clearDraftOrder();

        // Criar notificação
        await createNotification(result.orderId);

        // Enviar email se necessário
        if (formData.client_email) {
          await sendOrderEmail(result.orderId);
        }

        setCompleted(true);
      } else {
        alert(`Erro ao finalizar pedido: ${result.error}`);
      }
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      alert("Erro ao finalizar pedido. Tente novamente.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && !completed) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Carrinho vazio
            </h3>
            <p className="text-gray-600 mb-6">
              Adicione produtos ao carrinho antes de finalizar o pedido.
            </p>
            <button
              onClick={() => router.push(`/catalog/${userId}`)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              style={{ backgroundColor: settings?.primary_color || "#3B82F6" }}
            >
              Voltar ao Catálogo
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Pedido Finalizado!
          </h2>
          <p className="text-gray-600 mb-6">
            Seu pedido foi criado com sucesso e está sendo processado.
          </p>
          <div className="space-y-3">
            {completedOrderData && (
              <button
                onClick={handleGeneratePDF}
                disabled={generatingPDF}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {generatingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Recibo em PDF
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => router.push(`/catalog/${userId}`)}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Security Status Header */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className={`h-5 w-5 ${secureCheckout.state.isAuthenticated ? 'text-green-500' : 'text-red-500'}`} />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Checkout Seguro {secureCheckout.state.isAuthenticated ? 'Ativo' : 'Inativo'}
                </p>
                <p className="text-xs text-blue-700">
                  {secureCheckout.state.isAuthenticated
                    ? `Sessão válida até ${new Date(secureCheckout.state.lastActivity + 30 * 60 * 1000).toLocaleTimeString('pt-BR')}`
                    : 'Faça login para continuar'
                  }
                </p>
              </div>
            </div>
            {secureCheckout.loadDraftOrder() && (
              <div className="flex items-center space-x-2 text-blue-700">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Rascunho salvo automaticamente</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Header */}
      <header
        className="bg-white border-b border-gray-200"
        style={{ backgroundColor: settings?.header_color || "#FFFFFF" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || "#4B5563" }}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar
              </button>
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt="Logo"
                  className="h-14 w-auto"
                />
              ) : (
                <h1
                  className="text-2xl font-bold text-gray-900"
                  style={{
                    color: settings?.title_color || "#111827",
                    fontFamily: settings?.font_family || "Inter, sans-serif",
                  }}
                >
                  {settings?.name || "Rep-Vendas"}
                </h1>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Finalizar Pedido
          </h1>
          <p className="text-gray-600">
            {getTotalItems()} produto{getTotalItems() > 1 ? "s" : ""} • Total:
            R$ {getTotalValue().toFixed(2)}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
        >
          {/* Left Column - Order Details */}
          <div className="space-y-6">
            {/* Client Selection */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Dados do Cliente
              </h2>

              {clients.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar cliente existente
                  </label>
                  <select
                    value={selectedClient}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Novo cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.client_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        client_name: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        client_email: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone
                  </label>
                  <input
                    type="tel"
                    value={formData.client_phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        client_phone: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {!settings?.show_delivery_address && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Endereço de Entrega
                </h2>
                <div>
                  <textarea
                    required={!settings?.show_delivery_address}
                    value={formData.delivery_address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        delivery_address: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-300 rounded px-3 py-2 h-24"
                    placeholder="Endereço completo para entrega"
                  />
                </div>
              </div>
            )}

            {/* Payment Method */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Forma de Pagamento
              </h2>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="boleto"
                    checked={formData.payment_method === "boleto"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_method: e.target.value,
                      }))
                    }
                    className="mr-2"
                  />
                  Boleto Bancário
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pix"
                    checked={formData.payment_method === "pix"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_method: e.target.value,
                      }))
                    }
                    className="mr-2"
                  />
                  PIX
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="cartao"
                    checked={formData.payment_method === "cartao"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        payment_method: e.target.value,
                      }))
                    }
                    className="mr-2"
                  />
                  Cartão de Crédito
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Observações
              </h2>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="w-full border border-gray-300 rounded px-3 py-2 h-24"
                placeholder="Observações adicionais sobre o pedido"
              />
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            {/* Order Items */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Itens do Pedido
              </h2>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="w-16 h-16 flex-shrink-0">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-xs">
                            Sem imagem
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {item.product.brand || "Marca"}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <button
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-4 w-4 text-gray-600" />
                        </button>
                        <span className="text-sm font-medium min-w-[2rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => removeCartItem(item.product.id)}
                          className="w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-200 rounded-full transition-colors ml-2"
                          title="Remover item"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      {shouldShowPrices() ? (
                        <>
                          <p className="text-sm font-medium text-gray-900">
                            R$ {(item.product.price * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            R$ {item.product.price.toFixed(2)} cada
                          </p>
                        </>
                      ) : (
                        <div className="text-center">
                          <Lock className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">Preço protegido</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {cartItems.length === 0 && (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhum item no carrinho</p>
                </div>
              )}
            </div>

            {/* Order Total */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Resumo do Pedido
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Subtotal ({getTotalItems()} itens)
                  </span>
                  {shouldShowPrices() ? (
                    <span className="text-gray-900">
                      R$ {getTotalValue().toFixed(2)}
                    </span>
                  ) : (
                    <div className="flex items-center">
                      <Lock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-gray-500">Protegido</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frete</span>
                  <span className="text-green-600">Grátis</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between text-lg font-medium">
                    <span className="text-gray-900">Total</span>
                    {shouldShowPrices() ? (
                      <span className="text-gray-900">
                        R$ {getTotalValue().toFixed(2)}
                      </span>
                    ) : (
                      <div className="flex items-center">
                        <Lock className="h-5 w-5 text-gray-400 mr-1" />
                        <span className="text-gray-500">Protegido</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={secureCheckout.state.isProcessing}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: settings?.primary_color || "#3B82F6",
                }}
                onClick={(e) => {
                  if (!secureCheckout.state.isAuthenticated) {
                    e.preventDefault();
                    setShowAuthModal(true);
                  }
                }}
              >
                {secureCheckout.state.isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {secureCheckout.state.retryCount > 0
                      ? `Tentativa ${secureCheckout.state.retryCount + 1}...`
                      : 'Processando...'
                    }
                  </div>
                ) : !secureCheckout.state.isAuthenticated ? (
                  <div className="flex items-center justify-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Confirmar Senha para Finalizar
                  </div>
                ) : (
                  "Finalizar Pedido"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-600" />
                Confirmação de Segurança
              </h3>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthPassword("");
                  setShowAuthPassword(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Para finalizar o pedido, confirme sua senha:
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showAuthPassword ? "text" : "password"}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Digite sua senha"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleReauth();
                    }
                  }}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                >
                  {showAuthPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthPassword("");
                  setShowAuthPassword(false);
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReauth}
                disabled={authLoading || !authPassword.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {authLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
