import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Product, Settings, CartItem } from '@/lib/types';
import { toast } from 'sonner';
import { isNextRedirect } from '@/lib/isNextRedirect';
import { useParams } from 'next/navigation';

export function useCatalog(
  overrideUserId?: string,
  initialSettings?: Settings | null
) {
  const supabase = createClient();
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
  const [pricePasswordHash, setPricePasswordHash] = useState<string | null>(
    null
  );

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    if (!userId) return;

    const initCatalog = async () => {
      try {
        setLoading(true);

        // 1. Carregar Configurações e Produtos (se não vierem via props no futuro)
        // Nota: Mesmo que a página passe initialProducts, este fetch garante dados frescos se o usuário navegar
        // Buscar settings apenas se não foi fornecido como initialSettings (com resiliência .maybeSingle())
        const settingsPromise = initialSettings
          ? Promise.resolve({ data: initialSettings })
          : supabase
              .from('settings')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();
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
        if (productsRes.data) {
          // Normalizar produto: manter compatibilidade com schema atual onde
          // `price` pode representar custo. Aqui garantimos duas propriedades
          // no objeto do frontend:
          // - `cost`: valor de custo (vindo de `price` no banco)
          // - `price`: preço de venda (vindo de `sale_price` no banco, se existir)
          const normalized = (productsRes.data as any[]).map((p) => {
            const costVal = p.cost ?? p.price ?? null;
            const saleVal = p.sale_price ?? p.price ?? null;
            return {
              ...p,
              cost: costVal,
              price: saleVal,
            } as any;
          });
          setProducts(normalized as Product[]);
        }

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
          if (!isNextRedirect(err))
            console.debug('Não foi possível carregar logos de marcas', err);
        }

        // 4. Carregar hash público da senha (public_catalogs.price_password_hash)
        try {
          const { data: publicCatalog } = await supabase
            .from('public_catalogs')
            .select('price_password_hash')
            .eq('user_id', userId)
            .maybeSingle();

          if (publicCatalog && (publicCatalog as any).price_password_hash) {
            setPricePasswordHash((publicCatalog as any).price_password_hash);
          }
        } catch (err) {
          if (!isNextRedirect(err))
            console.debug('Não foi possível carregar price_password_hash', err);
        }

        // 2. Carregar Dados do Cliente (LocalStorage)
        // Isso só roda no navegador
        if (typeof window !== 'undefined') {
          const savedCart = localStorage.getItem('cart');
          if (savedCart) {
            try {
              setCart(JSON.parse(savedCart));
            } catch (e) {
              console.warn(
                'useCatalog: invalid cart in localStorage, clearing',
                savedCart
              );
              localStorage.removeItem('cart');
              setCart({});
            }
          }

          const savedFavs = localStorage.getItem('favorites');
          if (savedFavs) {
            try {
              setFavorites(new Set(JSON.parse(savedFavs)));
            } catch (e) {
              console.warn(
                'useCatalog: invalid favorites in localStorage, clearing',
                savedFavs
              );
              localStorage.removeItem('favorites');
              setFavorites(new Set());
            }
          }

          const access = localStorage.getItem('priceAccessGranted');
          if (access === 'true') setPriceAccessGranted(true);
        }
      } catch (error) {
        if (!isNextRedirect(error))
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
    if (!pricePasswordHash) {
      toast.error('Operação indisponível: senha não configurada');
      return false;
    }

    try {
      // calcular SHA-256 do input e comparar com hash público
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (hashHex === pricePasswordHash) {
        setPriceAccessGranted(true);
        localStorage.setItem('priceAccessGranted', 'true');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        localStorage.setItem('priceAccessExpiresAt', tomorrow.toISOString());
        toast.success('Acesso liberado!');
        return true;
      }

      toast.error('Senha incorreta');
      return false;
    } catch (err) {
      console.error('Erro ao verificar senha (cliente)', err);
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
      // Se usuário autenticado (Fluxo existente): usar endpoint server-side atual
      const { data: sessionData } = await supabase.auth.getSession();
      const session = (sessionData as any)?.session;

      if (session) {
        const res = await fetch('/api/save-cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: itemsPayload, userId }),
        });

        const data = await res.json();

        if (data.success) {
          toast.success('Pedido salvo com sucesso!');
          return data.code;
        }

        throw new Error(data.error || 'Erro ao salvar pedido');
      }

      // Flow para convidados (guest): usar RPC `api.insert_saved_cart_for_guest`
      if (typeof window === 'undefined') {
        toast.error('Operação não suportada no servidor');
        return '';
      }

      // Garantir guest_id no localStorage
      let guestId = localStorage.getItem('guest_id');
      if (!guestId) {
        guestId = crypto.randomUUID();
        localStorage.setItem('guest_id', guestId);
      }

      // Gerar shortId simples (6 chars) se necessário
      const generateShortId = () =>
        Math.random().toString(36).slice(2, 8).toUpperCase();

      const shortId = generateShortId();

      // note: wrapper public signature expects (p_guest_id, p_items, p_short_id)
      const rpcParams = {
        p_guest_id: guestId,
        p_items: itemsPayload,
        p_short_id: shortId,
      } as any;

      const { data: rpcData, error: rpcError } = await supabase.rpc(
        'insert_saved_cart_for_guest',
        rpcParams
      );

      if (rpcError) {
        console.error('RPC error', rpcError);
        toast.error('Erro ao salvar pedido (guest)');
        return '';
      }

      toast.success('Pedido salvo com sucesso!');
      return shortId;
    } catch (error) {
      console.error('saveCart error', error);
      toast.error('Erro ao salvar pedido');
      return '';
    }
  };

  const loadCart = async (code: string): Promise<boolean> => {
    try {
      // Se usuário autenticado: usar endpoint server-side existente
      const { data: sessionData } = await supabase.auth.getSession();
      const session = (sessionData as any)?.session;

      if (session) {
        const res = await fetch(`/api/load-cart?code=${code}`);
        const data = await res.json();

        if (data.success && data.items) {
          const newCart: Record<string, number> = {};
          data.items.forEach((item: any) => {
            newCart[item.product_id] = item.quantity;
          });

          setCart(newCart);
          localStorage.setItem('cart', JSON.stringify(newCart));
          setLoadedOrderCode(code);
          toast.success('Pedido carregado!');
          return true;
        }

        toast.error('Código inválido ou expirado');
        return false;
      }

      // Fluxo guest: usar RPC `api.get_saved_cart_for_guest`
      if (typeof window === 'undefined') {
        toast.error('Operação não suportada no servidor');
        return false;
      }

      const guestId = localStorage.getItem('guest_id');
      if (!guestId) {
        toast.error('Guest ID não encontrado');
        return false;
      }

      const { data: rpcRes, error: rpcErr } = await supabase.rpc(
        'get_saved_cart_for_guest',
        { p_short_id: code, p_guest_id: guestId }
      );

      if (rpcErr) {
        console.error('RPC load error', rpcErr);
        toast.error('Erro ao carregar pedido (guest)');
        return false;
      }

      const row = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes;
      if (!row || !row.items) {
        toast.error('Código inválido ou expirado');
        return false;
      }

      const newCart: Record<string, number> = {};
      (row.items as any[]).forEach((item: any) => {
        newCart[item.product_id] = item.quantity;
      });

      setCart(newCart);
      localStorage.setItem('cart', JSON.stringify(newCart));
      setLoadedOrderCode(code);
      toast.success('Pedido carregado!');
      return true;
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
