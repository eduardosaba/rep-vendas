'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { SYSTEM_LOGO_URL } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CreditCard,
  Truck,
  ArrowLeft,
  CheckCircle,
  MapPin,
  User,
  Phone,
  ShoppingCart,
} from 'lucide-react';

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
  show_delivery_address_checkout?: boolean;
  show_payment_method_checkout?: boolean;
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
  const supabase = createClient();
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [completed, setCompleted] = useState(false);
  const router = useRouter();

  // Form data
  const [formData, setFormData] = useState({
    company_name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    delivery_address: '',
    payment_method: 'boleto',
    notes: '',
  });

  const [selectedClient, setSelectedClient] = useState<string>('');

  useEffect(() => {
    loadCart();
    loadSettings();
  }, []);

  useEffect(() => {
    if (Object.keys(cart).length > 0) {
      loadCartItems();
    } else {
      setCartItems([]);
      setLoading(false);
    }
  }, [cart]);

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    } else {
      setLoading(false);
    }
  };

  const loadCartItems = async () => {
    const productIds = Object.keys(cart);
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds);

    if (products) {
      const items: CartItem[] = products.map((product) => ({
        product,
        quantity: cart[product.id] || 0,
      }));
      setCartItems(items);
    }
    setLoading(false);
  };

  const loadSettings = async () => {
    // CRÍTICO: Buscar settings do usuário autenticado (isolamento multi-tenant)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Resiliência: usar .maybeSingle() para não quebrar se não houver settings
    const { data: sets } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (sets) {
      setSettings(sets);
    }
  };

  const getTotalValue = () => {
    return cartItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  };

  const getTotalItems = () => {
    return Object.values(cart).reduce((total, quantity) => total + quantity, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Autenticação necessária', {
          description: 'Por favor, faça login para continuar.',
        });
        router.push('/login');
        return;
      }

      // Criar cliente se for novo
      let clientId = selectedClient;
      if (!selectedClient && formData.client_name.trim()) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            user_id: user.id,
            name: formData.client_name.trim(),
            email: formData.client_email?.trim() || null,
            phone: formData.client_phone?.trim() || null,
          })
          .select()
          .maybeSingle();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Criar o pedido
      const orderData = {
        user_id: user.id,
        client_id: clientId,
        status: 'Pendente',
        total_value: getTotalValue(),
        order_type: 'catalog',
        company_name: formData.company_name,
        delivery_address: formData.delivery_address,
        payment_method: formData.payment_method,
        notes: formData.notes,
        // Criar os itens do pedido
        order_items: cartItems.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
        })),
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: orderData.user_id,
          client_id: orderData.client_id,
          status: orderData.status,
          total_value: orderData.total_value,
          order_type: orderData.order_type,
          company_name: orderData.company_name,
          delivery_address: orderData.delivery_address,
          payment_method: orderData.payment_method,
          notes: orderData.notes,
        })
        .select()
        .maybeSingle();

      if (orderError) throw orderError;

      // Inserir os itens do pedido
      const orderItemsData = orderData.order_items.map((item: any) => ({
        order_id: order.id,
        product_id: item.product_id ?? item.productId ?? null,
        product_name: item.product_name ?? item.productName ?? null,
        product_reference:
          item.product_reference ?? item.reference_code ?? null,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? item.unitPrice ?? 0,
        total_price:
          item.total_price ??
          (item.unit_price ?? item.unitPrice ?? 0) * (item.quantity ?? 1),
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      // Criar notificação para o usuário sobre o novo pedido
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            title: 'Novo Pedido Recebido',
            message: `Pedido #${order.id.slice(-8).toUpperCase()} foi criado com sucesso. Valor: R$ ${getTotalValue().toFixed(2)}`,
            type: 'success',
            data: {
              orderId: order.id,
              orderNumber: order.id.slice(-8).toUpperCase(),
              totalValue: getTotalValue(),
              clientName: formData.client_name,
            },
          }),
        });
      } catch (notificationError) {
        console.error('Erro ao criar notificação:', notificationError);
        // Não falhar o pedido por causa da notificação
      }

      // Enviar email para o cliente se email foi fornecido
      if (formData.client_email) {
        try {
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333; text-align: center;">Pedido Recebido!</h1>
              <p>Olá ${formData.client_name},</p>
              <p>Seu pedido foi recebido com sucesso e está sendo processado.</p>

              <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3>Detalhes do Pedido:</h3>
                <p><strong>Número do Pedido:</strong> #${order.id.slice(-8).toUpperCase()}</p>
                <p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Valor Total:</strong> R$ ${getTotalValue().toFixed(2)}</p>
                <p><strong>Forma de Pagamento:</strong> ${formData.payment_method === 'boleto' ? 'Boleto Bancário' : formData.payment_method === 'pix' ? 'PIX' : 'Cartão de Crédito'}</p>
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
                `
                  )
                  .join('')}
              </div>

              ${
                settings?.show_delivery_address
                  ? `
                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                  <h3>Endereço de Entrega:</h3>
                  <p>${formData.delivery_address}</p>
                </div>
              `
                  : ''
              }

              ${
                formData.notes
                  ? `
                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                  <h3>Observações:</h3>
                  <p>${formData.notes}</p>
                </div>
              `
                  : ''
              }

              <p>Em breve entraremos em contato para confirmar os detalhes do pedido.</p>
              <p>Atenciosamente,<br>Equipe Rep-Vendas</p>
            </div>
          `;

          const emailText = `
            Pedido Recebido!

            Olá ${formData.client_name},

            Seu pedido foi recebido com sucesso e está sendo processado.

            Detalhes do Pedido:
            Número do Pedido: #${order.id.slice(-8).toUpperCase()}
            Data: ${new Date().toLocaleDateString('pt-BR')}
            Valor Total: R$ ${getTotalValue().toFixed(2)}
            Forma de Pagamento: ${formData.payment_method === 'boleto' ? 'Boleto Bancário' : formData.payment_method === 'pix' ? 'PIX' : 'Cartão de Crédito'}

            Itens do Pedido:
            ${cartItems.map((item) => `- ${item.product.name} (Qtd: ${item.quantity}) - R$ ${(item.product.price * item.quantity).toFixed(2)}`).join('\n')}

            ${
              settings?.show_delivery_address
                ? `Endereço de Entrega:
            ${formData.delivery_address}`
                : ''
            }

            ${formData.notes ? `Observações: ${formData.notes}` : ''}

            Em breve entraremos em contato para confirmar os detalhes do pedido.

            Atenciosamente,
            Equipe Rep-Vendas
          `;

          await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: formData.client_email,
              subject: `Pedido #${order.id.slice(-8).toUpperCase()} - Rep-Vendas`,
              html: emailHtml,
              text: emailText,
              userId: user.id,
            }),
          });
        } catch (emailError) {
          console.error('Erro ao enviar email:', emailError);
          // Não falhar o pedido por causa do email
        }
      }

      // Limpar Pedido
      localStorage.removeItem('cart');
      setCompleted(true);
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      toast.error('Erro ao finalizar pedido', {
        description:
          'Ocorreu um erro ao processar seu pedido. Por favor, tente novamente.',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Carregando checkout...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && !completed) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="py-16 text-center">
            <ShoppingCart className="mx-auto mb-4 h-24 w-24 text-gray-300" />
            <h3 className="mb-2 text-xl font-medium text-gray-900">
              Pedido vazio
            </h3>
            <p className="mb-6 text-gray-600">
              Adicione produtos ao Pedido antes de finalizar o pedido.
            </p>
            <button
              onClick={() => router.push('/')}
              className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
              style={{ backgroundColor: settings?.primary_color || '#4f46e5' }} // Fallback: Indigo-600
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
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Pedido Finalizado!
          </h2>
          <p className="mb-6 text-gray-600">
            Seu pedido foi criado com sucesso e está sendo processado.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700"
              style={{ backgroundColor: settings?.primary_color || '#4f46e5' }} // Fallback: Indigo-600
            >
              Ver Meus Pedidos
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full rounded-lg bg-gray-100 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-200"
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
      {/* Header */}
      <header
        className="border-b border-gray-200 bg-white"
        style={{ backgroundColor: settings?.header_color || '#FFFFFF' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || '#4B5563' }}
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Voltar
              </button>
              <div className="relative h-14 w-32">
                <Image
                  src={settings?.logo_url || SYSTEM_LOGO_URL}
                  alt={settings?.name || 'Rep-Vendas'}
                  fill
                  sizes="128px"
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Finalizar Pedido
          </h1>
          <p className="text-gray-600">
            {getTotalItems()} produto{getTotalItems() > 1 ? 's' : ''} • Total:
            R$ {getTotalValue().toFixed(2)}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-8 lg:grid-cols-2"
        >
          {/* Left Column - Order Details */}
          <div className="space-y-6">
            {/* Company and Client Details */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center text-lg font-medium text-gray-900">
                <User className="mr-2 h-5 w-5" />
                Dados do Pedido
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.company_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        company_name: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Nome da empresa"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Nome do Solicitante *
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
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Nome completo"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
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
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
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
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            {settings?.show_delivery_address_checkout === false ? null : (
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center text-lg font-medium text-gray-900">
                  <MapPin className="mr-2 h-5 w-5" />
                  Endereço de Entrega
                </h2>
                <div>
                  <textarea
                    required={true}
                    value={formData.delivery_address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        delivery_address: e.target.value,
                      }))
                    }
                    className="h-24 w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Endereço completo para entrega"
                  />
                </div>
              </div>
            )}

            {/* Payment Method */}
            {settings?.show_payment_method_checkout === false ? null : (
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center text-lg font-medium text-gray-900">
                  <CreditCard className="mr-2 h-5 w-5" />
                  Forma de Pagamento
                </h2>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="boleto"
                      checked={formData.payment_method === 'boleto'}
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
                      checked={formData.payment_method === 'pix'}
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
                      checked={formData.payment_method === 'cartao'}
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
            )}

            {/* Notes */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium text-gray-900">
                Observações
              </h2>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                className="h-24 w-full rounded border border-gray-300 px-3 py-2"
                placeholder="Observações adicionais sobre o pedido"
              />
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            {/* Order Items */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium text-gray-900">
                Itens do Pedido
              </h2>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center space-x-4"
                  >
                    <div className="h-16 w-16 flex-shrink-0 relative">
                      {item.product.image_url ? (
                        <Image
                          src={item.product.image_url}
                          alt={item.product.name}
                          fill
                          sizes="64px"
                          className="rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center rounded bg-gray-100">
                          <span className="text-xs text-gray-400">
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
                        {item.product.brand || 'Marca'}
                      </p>
                      <p className="text-sm text-gray-600">
                        Qtd: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        R$ {(item.product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Total */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-medium text-gray-900">
                Resumo do Pedido
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Subtotal ({getTotalItems()} itens)
                  </span>
                  <span className="text-gray-900">
                    R$ {getTotalValue().toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frete</span>
                  <span className="text-green-600">Grátis</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between text-lg font-medium">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">
                      R$ {getTotalValue().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  className="w-full rounded-lg bg-gray-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                  style={{
                    backgroundColor: settings?.secondary_color || '#6B7280',
                  }}
                >
                  Continuar Pedido
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{
                    backgroundColor: settings?.primary_color || '#4f46e5', // Fallback: Indigo-600
                  }}
                >
                  {processing ? (
                    <div className="flex items-center justify-center">
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Processando...
                    </div>
                  ) : (
                    'Finalizar Pedido'
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
