'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { CreditCard, Truck, ArrowLeft, CheckCircle, MapPin, User, Phone, ShoppingCart } from 'lucide-react'

interface Product {
  id: string
  name: string
  brand?: string
  reference_code?: string
  description?: string
  price: number
  image_url?: string
}

interface Settings {
  id?: string
  user_id?: string
  name?: string
  email?: string
  phone?: string
  logo_url?: string
  banner_url?: string
  primary_color?: string
  secondary_color?: string
  header_color?: string
  font_family?: string
  title_color?: string
  icon_color?: string
  hide_delivery_address?: boolean
  hide_installments?: boolean
}

interface CartItem {
  product: Product
  quantity: number
}

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
}

export default function Checkout() {
  const params = useParams()
  const userId = params.userId as string
  const [cart, setCart] = useState<{[key: string]: number}>({})
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [completed, setCompleted] = useState(false)
  const router = useRouter()

  // Form data
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    delivery_address: '',
    payment_method: 'boleto',
    notes: ''
  })

  useEffect(() => {
    if (userId) {
      loadCart()
      loadSettings()
      loadClients()
    }
  }, [userId])

  useEffect(() => {
    if (Object.keys(cart).length > 0) {
      loadCartItems()
    } else {
      setCartItems([])
      setLoading(false)
    }
  }, [cart])

  const loadCart = () => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      setCart(JSON.parse(savedCart))
    } else {
      setLoading(false)
    }
  }

  const loadCartItems = async () => {
    const productIds = Object.keys(cart)
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)

    if (products) {
      const items: CartItem[] = products.map(product => ({
        product,
        quantity: cart[product.id] || 0
      }))
      setCartItems(items)
    }
    setLoading(false)
  }

  const loadSettings = async () => {
    const { data: sets } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (sets) {
      setSettings(sets)
    }
  }

  const loadClients = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      setClients(clientsData || [])
    }
  }

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId)
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setFormData(prev => ({
        ...prev,
        client_name: client.name,
        client_email: client.email || '',
        client_phone: client.phone || '',
        delivery_address: client.address || ''
      }))
    }
  }

  const getTotalValue = () => {
    return cartItems.reduce((total, item) => total + (item.product.price * item.quantity), 0)
  }

  const getTotalItems = () => {
    return Object.values(cart).reduce((total, quantity) => total + quantity, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Usuário não autenticado')
        return
      }

      // Criar cliente se for novo
      let clientId = selectedClient
      if (!selectedClient && formData.client_name.trim()) {
        const { data: newClient, error: clientError } = await supabase
          .from('clients')
          .insert({
            user_id: userId, // Usar o userId do catálogo, não do usuário logado
            name: formData.client_name.trim(),
            email: formData.client_email?.trim() || null,
            phone: formData.client_phone?.trim() || null
          })
          .select()
          .single()

        if (clientError) throw clientError
        clientId = newClient.id
      }

      // Criar o pedido
      const orderData = {
        user_id: userId, // Usar o userId do catálogo
        client_id: clientId,
        status: 'Pendente',
        total_value: getTotalValue(),
        order_type: 'catalog',
        delivery_address: formData.delivery_address,
        payment_method: formData.payment_method,
        notes: formData.notes,
        // Criar os itens do pedido
        order_items: cartItems.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity
        }))
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: orderData.user_id,
          client_id: orderData.client_id,
          status: orderData.status,
          total_value: orderData.total_value,
          order_type: orderData.order_type,
          delivery_address: orderData.delivery_address,
          payment_method: orderData.payment_method,
          notes: orderData.notes
        })
        .select()
        .single()

      if (orderError) throw orderError

      // Inserir os itens do pedido
      const orderItemsData = orderData.order_items.map(item => ({
        order_id: order.id,
        ...item
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)

      if (itemsError) throw itemsError

      // Criar notificação para o usuário dono do catálogo
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: userId,
            title: 'Novo Pedido Recebido',
            message: `Pedido #${order.id.slice(-8).toUpperCase()} foi criado com sucesso. Valor: R$ ${getTotalValue().toFixed(2)}`,
            type: 'success',
            data: {
              orderId: order.id,
              orderNumber: order.id.slice(-8).toUpperCase(),
              totalValue: getTotalValue(),
              clientName: formData.client_name
            }
          })
        })
      } catch (notificationError) {
        console.error('Erro ao criar notificação:', notificationError)
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
                ${cartItems.map(item => `
                  <div style="border-bottom: 1px solid #dee2e6; padding: 10px 0;">
                    <p><strong>${item.product.name}</strong></p>
                    <p>Quantidade: ${item.quantity} | Preço: R$ ${item.product.price.toFixed(2)} | Total: R$ ${(item.product.price * item.quantity).toFixed(2)}</p>
                  </div>
                `).join('')}
              </div>

              ${settings?.show_delivery_address ? `
                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                  <h3>Endereço de Entrega:</h3>
                  <p>${formData.delivery_address}</p>
                </div>
              ` : ''}

              ${formData.notes ? `
                <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
                  <h3>Observações:</h3>
                  <p>${formData.notes}</p>
                </div>
              ` : ''}

              <p>Em breve entraremos em contato para confirmar os detalhes do pedido.</p>
              <p>Atenciosamente,<br>Equipe ${settings?.name || 'Rep-Vendas'}</p>
            </div>
          `

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
            ${cartItems.map(item => `- ${item.product.name} (Qtd: ${item.quantity}) - R$ ${(item.product.price * item.quantity).toFixed(2)}`).join('\n')}

            ${settings?.show_delivery_address ? `Endereço de Entrega:
            ${formData.delivery_address}` : ''}

            ${formData.notes ? `Observações: ${formData.notes}` : ''}

            Em breve entraremos em contato para confirmar os detalhes do pedido.

            Atenciosamente,
            Equipe ${settings?.name || 'Rep-Vendas'}
          `

          await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: formData.client_email,
              subject: `Pedido #${order.id.slice(-8).toUpperCase()} - ${settings?.name || 'Rep-Vendas'}`,
              html: emailHtml,
              text: emailText,
              userId: userId
            })
          })
        } catch (emailError) {
          console.error('Erro ao enviar email:', emailError)
          // Não falhar o pedido por causa do email
        }
      }

      // Limpar carrinho
      localStorage.removeItem('cart')
      setCompleted(true)

    } catch (error) {
      console.error('Erro ao finalizar pedido:', error)
      alert('Erro ao finalizar pedido. Tente novamente.')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando checkout...</p>
        </div>
      </div>
    )
  }

  if (cartItems.length === 0 && !completed) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <ShoppingCart className="h-24 w-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Carrinho vazio</h3>
            <p className="text-gray-600 mb-6">Adicione produtos ao carrinho antes de finalizar o pedido.</p>
            <button
              onClick={() => router.push(`/catalog/${userId}`)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              style={{ backgroundColor: settings?.primary_color || '#3B82F6' }}
            >
              Voltar ao Catálogo
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pedido Finalizado!</h2>
          <p className="text-gray-600 mb-6">
            Seu pedido foi criado com sucesso e está sendo processado.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/catalog/${userId}`)}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200" style={{ backgroundColor: settings?.header_color || '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
                style={{ color: settings?.icon_color || '#4B5563' }}
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar
              </button>
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-14 w-auto" />
              ) : (
                <h1 className="text-2xl font-bold text-gray-900" style={{ color: settings?.title_color || '#111827', fontFamily: settings?.font_family || 'Inter, sans-serif' }}>
                  {settings?.name || 'Rep-Vendas'}
                </h1>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Finalizar Pedido</h1>
          <p className="text-gray-600">
            {getTotalItems()} produto{getTotalItems() > 1 ? 's' : ''} • Total: R$ {getTotalValue().toFixed(2)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                    {clients.map(client => (
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
                    onChange={(e) => setFormData(prev => ({ ...prev, client_name: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, client_email: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, client_phone: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_address: e.target.value }))}
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
                    checked={formData.payment_method === 'boleto'}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="mr-2"
                  />
                  Boleto Bancário
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pix"
                    checked={formData.payment_method === 'pix'}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="mr-2"
                  />
                  PIX
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="cartao"
                    checked={formData.payment_method === 'cartao'}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="mr-2"
                  />
                  Cartão de Crédito
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Observações</h2>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 h-24"
                placeholder="Observações adicionais sobre o pedido"
              />
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            {/* Order Items */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Itens do Pedido</h2>
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex items-center space-x-4">
                    <div className="w-16 h-16 flex-shrink-0">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-xs">Sem imagem</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{item.product.name}</h3>
                      <p className="text-sm text-gray-600">{item.product.brand || 'Marca'}</p>
                      <p className="text-sm text-gray-600">Qtd: {item.quantity}</p>
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
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Resumo do Pedido</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({getTotalItems()} itens)</span>
                  <span className="text-gray-900">R$ {getTotalValue().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Frete</span>
                  <span className="text-green-600">Grátis</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between text-lg font-medium">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">R$ {getTotalValue().toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: settings?.primary_color || '#3B82F6' }}
              >
                {processing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processando...
                  </div>
                ) : (
                  'Finalizar Pedido'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}