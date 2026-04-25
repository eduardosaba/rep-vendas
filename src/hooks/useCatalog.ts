import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Product, Settings } from '@/lib/types';
import { toast } from 'sonner';
import { isNextRedirect } from '@/lib/isNextRedirect';
import { useParams } from 'next/navigation';

export function useCatalog(overrideUserId?: string, initialSettings?: Settings | null) {
  const supabase = createClient();
  const params = useParams();
  const userId = overrideUserId || (params?.slug as string);

  // --- ESTADOS DE DADOS ---
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(initialSettings || null);
  const [brandLogos, setBrandLogos] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [totalProducts, setTotalProducts] = useState<number>(0);

  // --- ESTADOS DE FILTRO E UI ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [priceAccessGranted, setPriceAccessGranted] = useState(false);
  const [pricePasswordHash, setPricePasswordHash] = useState<string | null>(null);

  // Helper de Normalização para Categorias (Igual ao do Componente Visual)
  const normalizeCategory = (v: string) => {
    if (!v) return '';
    let s = String(v).toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/^opt+/, '');
    if (s.includes('clipon') || (s.includes('clip') && s.includes('on')) || s.includes('clion')) return 'CLIPON';
    return s.toUpperCase();
  };

  // --- BUSCA DE PRODUTOS (SERVER-SIDE) ---
  useEffect(() => {
    if (!userId) return;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const p = new URLSearchParams();
        p.set('user_id', String(userId));
        p.set('page', String(currentPage));
        p.set('per_page', String(itemsPerPage));

        if (searchTerm) p.set('q', searchTerm);
        if (selectedCategory && selectedCategory !== 'all') p.set('category', selectedCategory);
        if (selectedBrands.length > 0) p.set('brands', selectedBrands.join(','));
        if (sortBy) p.set('sort', sortBy);
        if (sortOrder) p.set('order', sortOrder);

        const res = await fetch(`/api/catalog?${p.toString()}`);
        const data = await res.json();

        if (data.products) {
          const normalized = data.products.map((prod: any) => ({
            ...prod,
            price: prod.sale_price ?? prod.price ?? 0,
            cost: prod.cost ?? prod.price ?? 0,
          }));
          setProducts(normalized);
          setTotalProducts(data.count || 0);
        }
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [userId, currentPage, itemsPerPage, searchTerm, selectedCategory, selectedBrands, sortBy, sortOrder]);

  // --- CARREGAMENTO DE CONFIGURAÇÕES E LOGOS ---
  useEffect(() => {
    if (!userId) return;

    const loadSettings = async () => {
      try {
        if (!initialSettings) {
          const { data } = await supabase.from('settings').select('*').eq('user_id', userId).maybeSingle();
          if (data) {
            setSettings(data);
            setPricePasswordHash(data.price_password_hash);
          }
        }

        const { data: brandsData } = await supabase.from('brands').select('name,logo_url').eq('user_id', userId);
        if (brandsData) {
          const map: Record<string, string | null> = {};
          brandsData.forEach((b: any) => { map[b.name] = b.logo_url || null; });
          setBrandLogos(map);
        }
      } catch (err) {
        if (!isNextRedirect(err)) console.warn('loadSettings error', err);
      }
    };

    loadSettings();

    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedFavs = localStorage.getItem('favorites');
      if (savedFavs) setFavorites(new Set(JSON.parse(savedFavs)));

      if (localStorage.getItem('priceAccessGranted') === 'true') setPriceAccessGranted(true);
    }
  }, [userId]);

  // --- LISTAS AUXILIARES PARA FILTROS ---
  const allBrands = useMemo(() => {
    return [...new Set(products.map((p) => p.brand).filter(Boolean))].sort() as string[];
  }, [products]);

  useEffect(() => {
    // debug removed
  }, [allBrands]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return [...set].sort();
  }, [products]);

  // --- AÇÕES ---
  const addToCart = (productId: string, quantity = 1) => {
    const newCart = { ...cart, [productId]: (cart[productId] || 0) + quantity };
    setCart(newCart);
    localStorage.setItem('cart', JSON.stringify(newCart));
    toast.success('Adicionado ao pedido');
  };

  const toggleFavorite = (productId: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(productId)) newFavs.delete(productId);
    else newFavs.add(productId);
    setFavorites(newFavs);
    localStorage.setItem('favorites', JSON.stringify([...newFavs]));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedBrands([]);
    setSelectedCategory('all');
    setCurrentPage(1);
  };

  const requestPriceAccess = async (password: string) => {
    if (!pricePasswordHash) return false;
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex === pricePasswordHash) {
      setPriceAccessGranted(true);
      localStorage.setItem('priceAccessGranted', 'true');
      return true;
    }
    return false;
  };

  return {
    products,
    totalProducts,
    loading,
    settings,
    brandLogos,
    cart,
    favorites,
    searchTerm,
    setSearchTerm,
    selectedBrands,
    setSelectedBrands,
    selectedCategory,
    setSelectedCategory,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    viewMode,
    setViewMode,
    addToCart,
    toggleFavorite,
    clearFilters,
    priceAccessGranted,
    requestPriceAccess,
    allBrands,
    categories
  };
}
