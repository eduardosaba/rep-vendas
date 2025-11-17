"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/lib/supabaseClient";

// Função para formatar preços no formato brasileiro
const formatPrice = (price: number): string => {
  return price.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Constantes de paginação
const DEFAULT_ITEMS_PER_PAGE = 20;
const ITEMS_PER_PAGE_OPTIONS = [12, 20, 32, 48];

// Hook personalizado para debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface Product {
  id: string;
  name: string;
  brand?: string;
  reference_code?: string;
  description?: string;
  price: number;
  images?: string[];
  bestseller?: boolean;
  is_launch?: boolean;
  technical_specs?: string;
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
  show_shipping?: boolean;
  show_installments?: boolean;
  show_delivery_address?: boolean;
  show_installments_checkout?: boolean;
  show_discount?: boolean;
  show_old_price?: boolean;
  show_filter_price?: boolean;
  show_filter_category?: boolean;
  show_filter_bestseller?: boolean;
  show_filter_new?: boolean;
}

export interface UseCatalogReturn {
  // Estados
  userId: string;
  settings: Settings | null;
  products: Product[];
  searchTerm: string;
  selectedCategory: string;
  priceRange: [number, number];
  showFilters: boolean;
  viewMode: "grid" | "list";
  favorites: Set<string>;
  cart: { [key: string]: number };
  selectedBrands: string[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  currentPage: number;
  totalProducts: number;
  loading: boolean;
  bestsellerProducts: Product[];
  itemsPerPage: number;
  allBrands: string[];
  categories: string[];
  showOnlyBestsellers: boolean;
  showOnlyNew: boolean;

  // Ações
  setSearchTerm: (term: string) => void;
  setSelectedCategory: (category: string) => void;
  setPriceRange: (range: [number, number]) => void;
  setShowFilters: (show: boolean) => void;
  setViewMode: (mode: "grid" | "list") => void;
  setSelectedBrands: (brands: string[]) => void;
  setSortBy: (sort: string) => void;
  setSortOrder: (order: "asc" | "desc") => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  setShowOnlyBestsellers: (show: boolean) => void;
  setShowOnlyNew: (show: boolean) => void;

  // Funções de interação
  toggleFavorite: (productId: string) => void;
  addToCart: (productId: string, quantity: number) => void;
  clearFilters: () => void;

  // Utilitários
  formatPrice: (price: number) => string;
}

export const useCatalog = (): UseCatalogReturn => {
  const params = useParams();
  const userId = params.userId as string;
  const router = useRouter();
  const { addToast } = useToast();

  // Estados
  const [settings, setSettings] = useState<Settings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [bestsellerProducts, setBestsellerProducts] = useState<Product[]>([]);
  const [itemsPerPage, setItemsPerPage] = useState<number>(
    DEFAULT_ITEMS_PER_PAGE,
  );
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [showOnlyBestsellers, setShowOnlyBestsellers] =
    useState<boolean>(false);
  const [showOnlyNew, setShowOnlyNew] = useState<boolean>(false);

  // Debounce da busca
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Computed states
  const categories = ["Todos", ...allBrands];

  // Efeitos
  useEffect(() => {
    if (userId) {
      loadUserData();
      loadBestsellerProducts();
      loadAllBrands();
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadCatalogData(
        currentPage,
        debouncedSearch,
        selectedCategory,
        selectedBrands,
        priceRange,
        sortBy,
        sortOrder,
        showOnlyBestsellers,
        showOnlyNew,
      );
    }
  }, [
    userId,
    currentPage,
    debouncedSearch,
    selectedCategory,
    selectedBrands,
    priceRange,
    sortBy,
    sortOrder,
    itemsPerPage,
    showOnlyBestsellers,
    showOnlyNew,
  ]);

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [
    debouncedSearch,
    selectedCategory,
    selectedBrands,
    priceRange,
    sortBy,
    sortOrder,
    itemsPerPage,
    showOnlyBestsellers,
    showOnlyNew,
  ]);

  // Funções de carregamento de dados
  const loadUserData = async () => {
    // Carregar favoritos do localStorage
    const savedFavorites = localStorage.getItem("favorites");
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }

    // Carregar carrinho do localStorage
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }

    // Carregar preferência de items por página
    const savedItemsPerPage = localStorage.getItem("itemsPerPage");
    if (savedItemsPerPage) {
      setItemsPerPage(parseInt(savedItemsPerPage, 10));
    }

    // Carregar configurações do usuário
    try {
      const { data: userSettings, error } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (userSettings && !error) {
        setSettings(userSettings);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const loadBestsellerProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", userId)
        .eq("bestseller", true)
        .limit(10);

      if (error) throw error;

      setBestsellerProducts(data || []);
    } catch (error) {
      console.error("Erro ao carregar produtos best sellers:", error);
    }
  };

  const loadAllBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("brand")
        .eq("user_id", userId)
        .not("brand", "is", null);

      if (error) throw error;

      const uniqueBrands = [
        ...new Set(data.map((item: any) => item.brand).filter(Boolean)),
      ] as string[];
      setAllBrands(uniqueBrands.sort());
    } catch (error) {
      console.error("Erro ao carregar marcas:", error);
    }
  };

  const loadCatalogData = async (
    page: number,
    search: string,
    category: string,
    brands: string[],
    price: [number, number],
    sort: string,
    order: "asc" | "desc",
    onlyBestsellers: boolean,
    onlyNew: boolean,
  ) => {
    setLoading(true);
    try {
      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("user_id", userId);

      // 1. Filtro de Busca (ILike)
      if (search.trim()) {
        query = query.ilike("name", `%${search.trim()}%`);
      }

      // 2. Filtro de Categoria (Navbar)
      if (category !== "Todos") {
        query = query.eq("brand", category);
      }

      // 3. Filtro de Marcas (Sidebar)
      if (brands.length > 0) {
        query = query.in("brand", brands);
      }

      // 4. Filtro de Preço
      query = query.gte("price", price[0]).lte("price", price[1]);

      // 5. Filtro de Bestsellers
      if (onlyBestsellers) {
        query = query.eq("bestseller", true);
      }

      // 6. Filtro de Novos Lançamentos
      if (onlyNew) {
        query = query.eq("is_launch", true);
      }

      // 7. Ordenação
      let sortField = sort;
      if (sort === "name") sortField = "name";
      if (sort === "price") sortField = "price";
      if (sort === "brand") sortField = "brand";

      query = query.order(sortField, { ascending: order === "asc" });

      // 6. Paginação
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      setProducts(data || []);
      setTotalProducts(count || 0);
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      addToast({
        title: "Erro",
        message: "Não foi possível carregar os produtos.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Funções de interação
  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
    localStorage.setItem("favorites", JSON.stringify([...newFavorites]));
  };

  const addToCart = (productId: string, quantity: number) => {
    const newCart = { ...cart };
    const existingQuantity = newCart[productId] || 0;
    newCart[productId] = existingQuantity + quantity;
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));

    // Encontrar o produto para mostrar o nome no toast
    // Verificar tanto na lista principal quanto nos bestsellers
    const product =
      products.find((p) => p.id === productId) ||
      bestsellerProducts.find((p) => p.id === productId);

    addToast({
      title: "Produto adicionado!",
      message: `${quantity}x ${
        product?.name || "Produto"
      } adicionado ao carrinho`,
      type: "success",
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("Todos");
    setPriceRange([0, 10000]);
    setSelectedBrands([]);
    setShowOnlyBestsellers(false);
    setShowOnlyNew(false);
    setSortBy("name");
    setSortOrder("asc");
  };

  // Handlers para setters que precisam de lógica adicional
  const handleSetItemsPerPage = (items: number) => {
    setItemsPerPage(items);
    localStorage.setItem("itemsPerPage", items.toString());
  };

  return {
    // Estados
    userId,
    settings,
    products,
    searchTerm,
    selectedCategory,
    priceRange,
    showFilters,
    viewMode,
    favorites,
    cart,
    selectedBrands,
    sortBy,
    sortOrder,
    currentPage,
    totalProducts,
    loading,
    bestsellerProducts,
    itemsPerPage,
    allBrands,
    categories,
    showOnlyBestsellers,
    showOnlyNew,

    // Ações
    setSearchTerm,
    setSelectedCategory,
    setPriceRange,
    setShowFilters,
    setViewMode,
    setSelectedBrands,
    setSortBy,
    setSortOrder,
    setCurrentPage,
    setItemsPerPage: handleSetItemsPerPage,
    setShowOnlyBestsellers,
    setShowOnlyNew,

    // Funções de interação
    toggleFavorite,
    addToCart,
    clearFilters,

    // Utilitários
    formatPrice,
  };
};
