import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Product, Settings, CartItem } from '@/lib/types';
import { toast } from 'sonner';
import { useParams } from 'next/navigation';

export function useCatalog(
  overrideUserId?: string,
  initialSettings?: Settings | null
) {
  const params = useParams();
  // usar sonner programático

  // Prioriza o ID passado via props (resolvido no servidor), senão tenta ler da URL
  const userId = overrideUserId || (params.slug as string);

  // --- ESTADOS DE DADOS ---
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(
    initialSettings || null
  );
  const [brandLogos, setBrandLogos] = useState<Record<string, string | null>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({}); // { productId: quantity }
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loadedOrderCode, setLoadedOrderCode] = useState<string | null>(null);

  // --- ESTADOS DE FILTRO E UI ---
  const [searchTerm, setSearchTerm] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [showFilters, setShowFilters] = useState(false);
  const [showOnlyBestsellers, setShowOnlyBestsellers] = useState(false);
  const [showOnlyNew, setShowOnlyNew] = useState(false);

  // --- ESTADOS DE ACESSO (PREÇO) ---
  const [priceAccessGranted, setPriceAccessGranted] = useState(false);

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    if (!userId) return;

    const initCatalog = async () => {
      try {
        setLoading(true);

        // 1. Carregar Configurações e Produtos (se não vierem via props no futuro)
        // Nota: Mesmo que a página passe initialProducts, este fetch garante dados frescos se o usuário navegar
        // Buscar settings apenas se não foi fornecido como initialSettings
        const settingsPromise = initialSettings
          ? Promise.resolve({ data: initialSettings })
          : supabase
              .from('settings')
              .select('*')
              .eq('user_id', userId)
              .single();
        const productsPromise = supabase
          .from('products')
          .select('*')
          .eq('user_id', userId);

        const [settingsRes, productsRes] = await Promise.all([
          settingsPromise,
          productsPromise,
        ]);

        if (settingsRes && (settingsRes as any).data)
          setSettings((settingsRes as any).data);
        if (productsRes.data) setProducts(productsRes.data);

        // 3. Carregar logos das marcas (se existir tabela `brands`)
        try {
          const { data: brandsData } = await supabase
            .from('brands')
            .select('name,logo_url')
            .eq('user_id', userId);

          if (brandsData) {
            const map: Record<string, string | null> = {};
            (brandsData as any[]).forEach((b) => {
              if (b && b.name) map[b.name] = b.logo_url || null;
            });
            setBrandLogos(map);
          }
        } catch (err) {
          // Não crítico — continuar sem logos
          console.debug('Não foi possível carregar logos de marcas', err);
        }

        // 2. Carregar Dados do Cliente (LocalStorage)
        // Isso só roda no navegador
        if (typeof window !== 'undefined') {
          const savedCart = localStorage.getItem('cart');
          if (savedCart) setCart(JSON.parse(savedCart));

          const savedFavs = localStorage.getItem('favorites');
          if (savedFavs) setFavorites(new Set(JSON.parse(savedFavs)));

          const access = localStorage.getItem('priceAccessGranted');
          if (access === 'true') setPriceAccessGranted(true);
        }
      } catch (error) {
        console.error('Erro ao carregar catálogo:', error);
        toast.error('Erro ao carregar catálogo');
      } finally {
        setLoading(false);
      }
    };

    initCatalog();
  }, [userId]);

  // --- FILTRAGEM E ORDENAÇÃO ---
  // Usamos useMemo para não recalcular a lista toda vez que o componente renderizar
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // 1. Busca por Texto (Nome ou Referência)
        const matchesSearch =
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.reference_code &&
            product.reference_code
              .toLowerCase()
              .includes(searchTerm.toLowerCase()));

        // 2. Filtro de Preço
        const matchesPrice =
          product.price >= priceRange[0] && product.price <= priceRange[1];

        // 3. Filtro de Marca
        const matchesBrand =
          selectedBrands.length === 0 ||
          (product.brand && selectedBrands.includes(product.brand));

        // 4. Filtro de Categoria (Usando 'Brand' como categoria por enquanto, ajuste se tiver campo category)
        const matchesCategory =
          selectedCategory === 'Todos' || product.brand === selectedCategory;

        // 5. Filtros Especiais (Tags)
        const matchesBestseller = !showOnlyBestsellers || product.bestseller;
        const matchesNew = !showOnlyNew || product.is_launch;

        return (
          matchesSearch &&
          matchesPrice &&
          matchesBrand &&
          matchesCategory &&
          matchesBestseller &&
          matchesNew
        );
      })
      .sort((a, b) => {
        // Lógica de Ordenação
        if (sortBy === 'price') {
          return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
        }
        if (sortBy === 'brand') {
          const brandA = a.brand || '';
          const brandB = b.brand || '';
          return sortOrder === 'asc'
            ? brandA.localeCompare(brandB)
            : brandB.localeCompare(brandA);
        }
        // Default: Nome
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
  }, [
    products,
    searchTerm,
    priceRange,
    selectedBrands,
    selectedCategory,
    sortBy,
    sortOrder,
    showOnlyBestsellers,
    showOnlyNew,
  ]);

  // --- PAGINAÇÃO ---
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // --- LISTAS AUXILIARES (Marcas/Categorias dinâmicas) ---
  const allBrands = useMemo(
    () =>
      [
        ...new Set(products.map((p) => p.brand).filter(Boolean) as string[]),
      ].sort(),
    [products]
  );
  const categories = useMemo(() => ['Todos', ...allBrands], [allBrands]);
  const bestsellerProducts = useMemo(
    () => products.filter((p) => p.bestseller).slice(0, 10),
    [products]
  );

  // --- AÇÕES DO CARRINHO ---
  const addToCart = (productId: string, quantity = 1) => {
    const newCart = { ...cart };
    newCart[productId] = (newCart[productId] || 0) + quantity;

    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));

    const product = products.find((p) => p.id === productId);
    toast.success('Adicionado ao pedido', {
      description: `${quantity}x ${product?.name || 'Produto'}`,
    });
  };

  // --- AÇÕES DE FAVORITOS ---
  const toggleFavorite = (productId: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(productId)) {
      newFavs.delete(productId);
      toast('Removido dos favoritos');
    } else {
      newFavs.add(productId);
      toast.success('Adicionado aos favoritos');
    }
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify([...newFavs]));
  };

  // --- CONTROLE DE UI ---
  const clearFilters = () => {
    setSearchTerm('');
    setPriceRange([0, 10000]);
    setSelectedBrands([]);
    setSelectedCategory('Todos');
    setShowOnlyBestsellers(false);
    setShowOnlyNew(false);
    setCurrentPage(1);
    toast('Filtros limpos');
  };

  // --- CONTROLE DE ACESSO (PREÇOS) ---
  const checkPriceAccess = () => priceAccessGranted;

  const requestPriceAccess = async (password: string) => {
    try {
      const res = await fetch('/api/check-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordAttempt: password, userId }),
      });
      const data = await res.json();

      if (data.success) {
        setPriceAccessGranted(true);
        localStorage.setItem('priceAccessGranted', 'true');
        // Define expiração para 24h (opcional, boa prática)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        localStorage.setItem('priceAccessExpiresAt', tomorrow.toISOString());

        toast.success('Acesso liberado!');
        return true;
      } else {
        toast.error('Senha incorreta');
        return false;
      }
    } catch (error) {
      toast.error('Erro ao verificar senha');
      return false;
    }
  };

  // --- FORMATADOR ---
  const formatPrice = useCallback(
    (price: number) => {
      if (!priceAccessGranted) return 'R$ ---';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(price);
    },
    [priceAccessGranted]
  );

  // --- PERSISTÊNCIA DE PEDIDO (API) ---
  const saveCart = async (): Promise<string> => {
    if (Object.keys(cart).length === 0) {
      toast('Carrinho vazio');
      return '';
    }

    // Converte o objeto cart {id: qty} para o formato que a API espera (array)
    // Mas nossa API espera o objeto JSONB direto ou array?
    // No nosso type Order, não definimos estritamente, mas a API de save-cart espera { items: ... }
    // Vamos mandar um array de objetos simples
    const itemsPayload = Object.entries(cart).map(([productId, quantity]) => ({
      product_id: productId,
      quantity,
    }));

    try {
      const res = await fetch('/api/save-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload, userId }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Pedido salvo com sucesso!');
        return data.code; // Retorna o código curto (ex: X7K9P2)
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('Erro ao salvar pedido');
      return '';
    }
  };

  const loadCart = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/load-cart?code=${code}`);
      const data = await res.json();

      if (data.success && data.items) {
        // Converter o array de volta para o mapa {id: qty}
        const newCart: Record<string, number> = {};
        data.items.forEach((item: any) => {
          newCart[item.product_id] = item.quantity;
        });

        setCart(newCart);
        localStorage.setItem('cart', JSON.stringify(newCart));
        setLoadedOrderCode(code);
        toast.success('Pedido carregado!');
        return true;
      } else {
        toast.error('Código inválido ou expirado');
        return false;
      }
    } catch (error) {
      toast.error('Erro ao carregar pedido');
      return false;
    }
  };

  return {
    // Dados Básicos
    userId,
    loading,
    products: paginatedProducts,
    totalProducts: filteredProducts.length,
    settings,
    cart,
    loadedOrderCode,
    favorites,
    bestsellerProducts,

    // Listas Auxiliares
    allBrands,
    categories,

    // Estados de Filtro
    searchTerm,
    priceRange,
    selectedBrands,
    selectedCategory,
    sortBy,
    sortOrder,
    viewMode,
    currentPage,
    itemsPerPage,
    showFilters,
    showOnlyBestsellers,
    showOnlyNew,

    // Setters
    setSearchTerm,
    setPriceRange,
    setSelectedBrands,
    setSelectedCategory,
    setSortBy,
    setSortOrder,
    setViewMode,
    setCurrentPage,
    setItemsPerPage,
    setShowFilters,
    setShowOnlyBestsellers,
    setShowOnlyNew,

    // Ações
    addToCart,
    toggleFavorite,
    clearFilters,

    // Lógica de Negócio
    formatPrice,
    priceAccessGranted,
    checkPriceAccess,
    requestPriceAccess,
    saveCart,
    loadCart,
    // Brand logos map: { [brandName]: logo_url }
    brandLogos,
  };
}
