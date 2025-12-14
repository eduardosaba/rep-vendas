'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  FileText,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ArrowLeft,
  Package,
  Zap,
  CreditCard,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Box,
  UserPlus,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import { createOrder } from '@/app/catalogo/actions';

// Tipos
interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  reference_code: string;
  brand: string | null;
  category: string | null;
  stock_quantity?: number;
  track_stock?: boolean;
}

interface CartItem extends Product {
  quantity: number;
  is_manual?: boolean; // Flag para itens avulsos
}

interface Props {
  initialProducts: Product[];
  userSettings: any;
  userId: string;
}

export function NewOrderClient({
  initialProducts,
  userSettings,
  userId,
}: Props) {
  const router = useRouter();
  // usar sonner programático

  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState<'catalog' | 'manual'>('catalog');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cliente
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    cnpj: '', // CPF ou CNPJ
  });

  // Filtros Catálogo
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Item Manual (Simples)
  const [manualItem, setManualItem] = useState({
    description: '',
    brand: '',
    price: '',
    quantity: 1,
  });

  // --- LÓGICA DO CATÁLOGO ---
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          initialProducts.map((p) => p.category).filter(Boolean) as string[]
        )
      ).sort(),
    [initialProducts]
  );

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.reference_code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [initialProducts, searchTerm, selectedCategory]);

  // --- AÇÕES DO CARRINHO ---

  const addToCart = (product: Product) => {
    // Verifica Estoque se necessário
    if (
      userSettings?.enable_stock_management &&
      !userSettings?.global_allow_backorder
    ) {
      const currentQtyInCart =
        cart.find((c) => c.id === product.id)?.quantity || 0;
      // Se rastreia estoque E (estoque atual < (já no carrinho + 1))
      if (
        product.track_stock &&
        (product.stock_quantity || 0) < currentQtyInCart + 1
      ) {
        toast(
          `Estoque insuficiente: Apenas ${product.stock_quantity} unidades disponíveis.`
        );
        return;
      }
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success('Adicionado ao pedido');
  };

  const addManualItem = () => {
    if (!manualItem.description || !manualItem.price) {
      toast('Preencha descrição e preço');
      return;
    }

    const price = parseFloat(manualItem.price.replace(',', '.'));
    if (isNaN(price)) {
      toast.error('Preço inválido');
      return;
    }

    const newItem: CartItem = {
      id: `manual-${Date.now()}`, // ID temporário
      name: manualItem.description,
      price: price,
      brand: manualItem.brand || 'Avulso',
      quantity: Number(manualItem.quantity),
      reference_code: 'AVULSO',
      image_url: null,
      category: 'Avulso',
      is_manual: true,
      track_stock: false, // Importante: Itens manuais não controlam estoque
      stock_quantity: 9999, // Infinito virtual
    };

    setCart((prev) => [...prev, newItem]);
    setManualItem({ description: '', brand: '', price: '', quantity: 1 }); // Reset
    toast.success('Item avulso adicionado');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);

          // Validação de estoque para produtos catalogados
          if (
            !item.is_manual &&
            delta > 0 &&
            userSettings?.enable_stock_management &&
            !userSettings?.global_allow_backorder
          ) {
            if (item.track_stock && (item.stock_quantity || 0) < newQty) {
              if (true) toast('Limite de estoque atingido');
              return item;
            }
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id: string) =>
    setCart((prev) => prev.filter((item) => item.id !== id));

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  // --- FINALIZAR ---
  const handleFinalize = async () => {
    if (!customer.name) {
      toast('Informe o nome do cliente');
      return;
    }
    if (cart.length === 0) {
      toast('Carrinho vazio');
      return;
    }

    setIsSubmitting(true);
    try {
      // CORREÇÃO CRÍTICA: Higienizar o carrinho antes de enviar.
      // Itens manuais têm IDs como "manual-123" que quebram o banco se ele esperar UUID.
      // Removemos o ID dos itens manuais (ou passamos null/undefined) para que o banco saiba que não é um produto cadastrado.
      const sanitizedCart = cart.map((item) => {
        if (item.is_manual) {
          // Clona o item removendo o ID temporário inválido
          const { id, ...rest } = item;
          return { ...rest, id: undefined }; // Backend deve tratar id undefined como item sem vínculo
        }
        return item;
      });

      const result = await createOrder(userId, customer, sanitizedCart);

      if (result.success) {
        toast.success('Venda realizada com sucesso!');
        // Redireciona para o detalhe do novo pedido
        router.push(`/dashboard/orders/${result.orderId}`);
      } else {
        console.error('Erro na criação:', result.error);
        toast.error('Erro ao finalizar', {
          description: result.error || 'Falha desconhecida',
        });
      }
    } catch (error: any) {
      console.error('Erro crítico no handleFinalize:', error);
      toast.error('Erro crítico', { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-1rem)] overflow-hidden bg-gray-50 -m-4 lg:-m-8 rounded-xl border border-gray-200 shadow-sm">
      {/* --- COLUNA ESQUERDA: PRODUTOS E CLIENTE --- */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 bg-white">
        {/* Header Esquerdo */}
        <div className="bg-white p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              href="/dashboard/orders"
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Nova Venda</h1>
          </div>

          {/* Toggle Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 sm:flex-none justify-center px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'catalog' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Package size={16} /> Catálogo
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 sm:flex-none justify-center px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Zap size={16} /> Item Avulso
            </button>
          </div>
        </div>

        {/* Área de Scroll */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* 1. DADOS DO CLIENTE */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-indigo-600" /> Identificar
              Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  className="w-full p-2 border rounded-lg bg-white"
                  placeholder="Nome do cliente"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Telefone / WhatsApp
                </label>
                <div className="relative">
                  <Phone
                    size={14}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                  <input
                    type="tel"
                    className="w-full pl-9 p-2 border rounded-lg bg-white"
                    placeholder="(00) 00000-0000"
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer({ ...customer, phone: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  CPF / CNPJ
                </label>
                <div className="relative">
                  <FileText
                    size={14}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                  <input
                    type="text"
                    className="w-full pl-9 p-2 border rounded-lg bg-white"
                    placeholder="Documento"
                    value={customer.cnpj}
                    onChange={(e) =>
                      setCustomer({ ...customer, cnpj: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                  Email (Opcional)
                </label>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                  <input
                    type="email"
                    className="w-full pl-9 p-2 border rounded-lg bg-white"
                    placeholder="cliente@email.com"
                    value={customer.email}
                    onChange={(e) =>
                      setCustomer({ ...customer, email: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. SELEÇÃO DE PRODUTOS */}
          {activeTab === 'catalog' ? (
            <div className="space-y-4">
              {/* Filtros */}
              <div className="flex gap-2 sticky top-0 bg-white py-2 z-10">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Buscar produto..."
                    className="w-full pl-10 p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <select
                  className="p-3 rounded-xl border border-gray-200 bg-white outline-none cursor-pointer shadow-sm max-w-[150px]"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">Todas Categorias</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group"
                    onClick={() => addToCart(product)}
                  >
                    <div className="aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden flex items-center justify-center border border-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {product.image_url ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            style={{ objectFit: 'contain' }}
                            className="group-hover:scale-105 transition-transform"
                          />
                        </div>
                      ) : (
                        <Package className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 truncate text-sm">
                          {product.name}
                        </h4>
                        <p className="text-xs text-gray-500 truncate">
                          {product.reference_code}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-green-700 font-bold text-sm bg-green-50 px-2 py-0.5 rounded">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(product.price)}
                      </span>
                      <button className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  Nenhum produto encontrado.
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Zap size={18} className="text-yellow-500" /> Adicionar Item
                Avulso
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    Descrição do Item
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    placeholder="Ex: Serviço de Instalação"
                    value={manualItem.description}
                    onChange={(e) =>
                      setManualItem({
                        ...manualItem,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                    Marca (Opcional)
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded-lg"
                    placeholder="Ex: Genérico"
                    value={manualItem.brand}
                    onChange={(e) =>
                      setManualItem({ ...manualItem, brand: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                      Valor Unit. (R$)
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-lg"
                      placeholder="0,00"
                      value={manualItem.price}
                      onChange={(e) =>
                        setManualItem({ ...manualItem, price: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                      Qtd
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-lg"
                      value={manualItem.quantity}
                      onChange={(e) =>
                        setManualItem({
                          ...manualItem,
                          quantity: Number(e.target.value),
                        })
                      }
                      min="1"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 pt-2">
                  <button
                    onClick={addManualItem}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                  >
                    Adicionar ao Pedido
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- COLUNA DIREITA: RESUMO DO PEDIDO (CARRINHO) --- */}
      <div className="w-full lg:w-[400px] bg-white border-l border-gray-200 flex flex-col shadow-xl z-20 h-[40vh] lg:h-auto relative">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart size={20} className="text-indigo-600" /> Carrinho
          </h2>
          <span className="bg-white border px-2 py-1 rounded text-xs font-bold">
            {cart.reduce((a, b) => a + b.quantity, 0)} itens
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Box size={48} className="mb-3 opacity-20" />
              <p>O carrinho está vazio.</p>
              <p className="text-xs mt-1">Adicione produtos à esquerda.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 border rounded-xl bg-white shadow-sm group hover:border-indigo-200 transition-colors"
              >
                <div className="h-14 w-14 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.image_url ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={item.image_url}
                        alt={item.name || ''}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  ) : (
                    <Package size={16} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-sm text-gray-900 truncate">
                      {item.name}
                    </h4>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-300 hover:text-red-500 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {item.brand}{' '}
                    {item.is_manual && (
                      <span className="bg-yellow-100 text-yellow-800 px-1 rounded text-[9px]">
                        Manual
                      </span>
                    )}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-indigo-700">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(item.price * item.quantity)}
                    </div>
                    <div className="flex items-center border rounded-lg bg-gray-50">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-2 py-0.5 hover:bg-white rounded text-gray-600"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-2 py-0.5 hover:bg-white rounded text-green-600"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer do Carrinho */}
        <div className="p-5 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-end mb-4">
            <span className="text-gray-500 font-medium">Total Geral</span>
            <span className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(cartTotal)}
            </span>
          </div>
          <button
            onClick={handleFinalize}
            disabled={isSubmitting || cart.length === 0}
            className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle size={20} />
            )}
            Finalizar Venda
          </button>
        </div>
      </div>
    </div>
  );
}
