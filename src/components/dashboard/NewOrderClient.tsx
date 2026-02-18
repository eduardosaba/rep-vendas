'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
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
  CheckCircle,
  Loader2,
  Box,
  UserPlus,
  X,
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
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

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
  const [selectedBrand, setSelectedBrand] = useState('all');

  // Item Manual (Simples)
  const [manualItem, setManualItem] = useState({
    description: '',
    brand: '',
    price: '',
    quantity: 1,
  });

  // --- LÓGICA DO CATÁLOGO ---
  // Helper para mapear URLs de storage Supabase para o proxy local
  const getSafeUrl = (url: string | null | undefined) => {
    if (!url) return null;
    try {
      if (url.includes('/storage/v1/object/public/') || url.includes('supabase.co/storage')) {
        const parts = url.split('/storage/v1/object/public/');
        const path = parts.length > 1 ? parts[1] : parts[0];
        return `/api/storage-image?path=${encodeURIComponent(path)}`;
      }
    } catch (e) {
      // fallback to raw url
    }
    return url;
  };
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          initialProducts.map((p) => p.category).filter(Boolean) as string[]
        )
      ).sort(),
    [initialProducts]
  );

  const brands = useMemo(
    () =>
      Array.from(
        new Set(
          initialProducts.map((p) => p.brand).filter(Boolean) as string[]
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
      const matchesBrand = selectedBrand === 'all' || p.brand === selectedBrand;
      return matchesSearch && matchesCategory;
    });
  }, [initialProducts, searchTerm, selectedCategory, selectedBrand]);

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
    setCart((prev) => {
      const existing = prev.find((it) => it.id === id);
      if (!existing) return prev;

      const newQty = existing.quantity + delta;

      // Se reduzir para zero ou menos, remover o item do carrinho
      if (newQty <= 0) {
        return prev.filter((it) => it.id !== id);
      }

      // Validação de estoque apenas quando aumentando
      if (
        !existing.is_manual &&
        delta > 0 &&
        userSettings?.enable_stock_management &&
        !userSettings?.global_allow_backorder
      ) {
        if (existing.track_stock && (existing.stock_quantity || 0) < newQty) {
          toast('Limite de estoque atingido');
          return prev;
        }
      }

      return prev.map((item) =>
        item.id === id ? { ...item, quantity: newQty } : item
      );
    });
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
    <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
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
              className={`flex-1 sm:flex-none justify-center px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'catalog' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Package size={16} /> Catálogo
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 sm:flex-none justify-center px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
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
              <UserPlus size={18} className="text-primary" /> Identificar
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
                    className="w-full pl-10 p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm"
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
                <select
                  className="p-3 rounded-xl border border-gray-200 bg-white outline-none cursor-pointer shadow-sm max-w-[150px]"
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                >
                  <option value="all">Todas Marcas</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-primary/30 transition-all cursor-pointer group"
                    onClick={() => addToCart(product)}
                  >
                    <div className="aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden flex items-center justify-center border border-gray-100">
                      {}
                      {product.image_url ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={getSafeUrl(product.image_url) || product.image_url || ''}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 100vw, 33vw"
                            style={{ objectFit: 'contain' }}
                            className="group-hover:scale-105 transition-transform"
                            loading="lazy"
                            quality={75}
                            unoptimized
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
                      <button className="p-1.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors">
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
                    placeholder="Ex: óculos de sol modelo X"
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
                    className="w-full py-2.5 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors"
                  >
                    Adicionar ao Pedido
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- COLUNA DIREITA: RESUMO DO PEDIDO (DESKTOP) --- */}
      <div className="hidden lg:flex w-[400px] bg-white border-l border-gray-200 flex-col shadow-xl z-20 lg:h-auto relative lg:pb-0">
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart size={20} className="text-primary" /> Carrinho
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
                className="flex gap-3 p-3 border rounded-xl bg-white shadow-sm group hover:border-primary/30 transition-colors"
              >
                <div className="h-14 w-14 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                  {item.image_url ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={getSafeUrl(item.image_url) || item.image_url || ''}
                        alt={item.name || ''}
                        width={56}
                        height={56}
                        className="object-cover"
                        unoptimized
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
                      className="text-gray-300 hover:text-red-500 p-1 flex items-center gap-1"
                      title="Excluir item"
                      aria-label="Excluir item"
                    >
                      <Trash2 size={14} />
                      <span className="sr-only">Excluir</span>
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
                    <div className="text-sm font-bold text-primary">
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

        {/* Footer do Carrinho (desktop) */}
        <div className="p-5 border-t border-gray-200 bg-gray-50 lg:static rounded-none">
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

      {/* --- MOBILE: Barra fixa + painel offcanvas --- */}
      {/* Barra fixa móvel (sempre visível) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileCartOpen((s) => !s)}
              className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border"
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={18} />
              <span className="text-sm font-bold">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            </button>

            <button
              onClick={handleFinalize}
              disabled={isSubmitting || cart.length === 0}
              className="py-2 px-3 bg-green-600 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finalizar
            </button>
          </div>

          <div className="flex-1 text-right">
            <div className="text-xs text-gray-500">Total</div>
            <div className="font-bold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(cartTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* Painel móvel (offcanvas) */}
      {/** Renderiza somente em mobile quando aberto para evitar espaço extra **/}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white overflow-auto">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <ShoppingCart size={18} /> Carrinho
            </h3>
            <button onClick={() => setMobileCartOpen(false)} className="p-2">
              <X />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-gray-400">
                <Box size={48} className="mb-3 opacity-20" />
                <p>O carrinho está vazio.</p>
                <p className="text-xs mt-1">Adicione produtos à esquerda.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 border rounded-xl bg-white shadow-sm group hover:border-primary/30 transition-colors"
                >
                  <div className="h-14 w-14 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                    {item.image_url ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={item.image_url}
                          alt={item.name || ''}
                          width={56}
                          height={56}
                          className="object-cover"
                          unoptimized
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
                        className="text-gray-300 hover:text-red-500 p-1 flex items-center gap-1"
                        title="Excluir item"
                        aria-label="Excluir item"
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
                      <div className="text-sm font-bold text-primary">
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

          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500">Total</span>
              <span className="font-bold">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(cartTotal)}
              </span>
            </div>
            <button
              onClick={() => {
                setMobileCartOpen(false);
                handleFinalize();
              }}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle size={18} />}
              Finalizar Venda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
