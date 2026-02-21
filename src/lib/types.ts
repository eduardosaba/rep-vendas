/**
 * src/lib/types.ts
 * Definições globais de tipos para o ecossistema RepVendas SaaS.
 */

// --- 1. USUÁRIO E PERFIS ---
export type UserRole = 'master' | 'rep' | 'client_guest';
export type AccountStatus = 'active' | 'inactive' | 'blocked' | 'trial';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  status: AccountStatus;
  plan_id: string;
  onboarding_completed?: boolean;
  license_expires_at: string;
  created_at: string;
  updated_at?: string;
}

// --- 2. PRODUTOS E ESTOQUE ---
export interface Product {
  id: string;
  user_id: string;
  name: string;
  slug?: string;
  brand?: string | null;
  reference_code?: string | null;
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;

  // Preços
  price: number; // Preço Base / Custo
  sale_price?: number | null; // Preço de Venda Sugerido
  original_price?: number | null; // Preço "De" para promoções
  track_stock?: boolean;

  // Imagens
  image_url?: string | null;
  image_path?: string | null; // Caminho no Supabase Storage
  external_image_url?: string | null;
  images?: string[]; // Galeria adicional
  linked_images?: string[]; // URLs vinculadas/importadas (nova coluna)
  image_variants?: Array<{ size: number; path: string; url?: string }> | null; // Variantes responsivas (480w, 1200w)
  sync_status?: 'pending' | 'synced' | 'failed' | null;
  sync_error?: string | null;
  product_images?: { id: string; url: string; sync_status: string }[]; // Nova estrutura de galeria

  // Categorização e Status
  category?: string | null;
  category_id?: string | null;
  is_active?: boolean;
  is_best_seller?: boolean;
  // legacy / convenience
  bestseller?: boolean;
  is_launch?: boolean;

  // Dados Técnicos
  technical_specs?: string | Record<string, any> | null;
  stock_quantity?: number;
  color?: string | null;
  gender?: 'feminino' | 'masculino' | 'teen' | 'unisex' | null;

  created_at?: string;
  updated_at?: string;
}

// --- IMAGENS / VARIANTES ---
export interface ImageVariant {
  size: number;
  url: string;
  path: string | null;
}

export interface ImageMetadata {
  variants?: ImageVariant[];
}

// --- 3. CONFIGURAÇÕES E BRANDING (MULTI-TENANT) ---

/**
 * Base comum para garantir que as cores e o branding sejam idênticos
 * no Dashboard e no Catálogo Público.
 */
export interface BaseStoreSettings {
  primary_color?: string;
  secondary_color?: string;
  header_background_color?: string;
  footer_background_color?: string;
  logo_url?: string | null;
  store_name?: string;
  // Legacy / convenience
  name?: string;
  // Products list (some components expect store.products)
  products?: Product[];
  footer_message?: string;
  phone?: string;
  email?: string;
  icon_color?: string;

  // Regras de Exibição
  show_sale_price?: boolean;
  // Legacy alias used across components
  show_old_price?: boolean;
  show_discount?: boolean;
  show_cost_price?: boolean;
  show_installments?: boolean;
  max_installments?: number;
  show_cash_discount?: boolean;
  cash_price_discount_percent?: number;
  enable_stock_management?: boolean;
  manage_stock?: boolean;
  show_shipping?: boolean;
  global_allow_backorder?: boolean;
  // UI-specific quick filters
  show_filter_new?: boolean;
  show_filter_bestseller?: boolean;
  show_filter_price?: boolean;
  show_filter_category?: boolean;
}

/**
 * Interface para a tabela 'public_catalogs' (acessada por visitantes).
 */
export interface PublicCatalog extends BaseStoreSettings {
  id: string;
  user_id: string;
  slug: string;
  is_active: boolean;
  price_password_hash?: string;
  banners?: string[] | null;
  banners_mobile?: string[] | null;
  created_at?: string;
}

/**
 * Interface para a tabela 'settings' (configurações privadas do usuário).
 */
export interface Settings extends BaseStoreSettings {
  id?: string;
  user_id?: string;
  catalog_slug?: string;
  price_password_hash?: string;

  // Banners e Marketing
  banners?: string[] | null;
  banners_mobile?: string[] | null;
  show_top_benefit_bar?: boolean;
  top_benefit_text?: string;
  top_benefit_bg_color?: string;
  top_benefit_text_color?: string;
  // Grid columns for storefront responsive layout
  grid_cols_default?: number | null;
  grid_cols_sm?: number | null;
  grid_cols_md?: number | null;
  grid_cols_lg?: number | null;
  grid_cols_xl?: number | null;

  // Configurações de Checkout
  show_delivery_address_checkout?: boolean;
  show_payment_method_checkout?: boolean;
  // Top benefit / banner extras used by Store layout
  top_benefit_height?: number;
  top_benefit_text_size?: number;
  top_benefit_image_url?: string | null;
  top_benefit_image_fit?: string | null;
  top_benefit_image_scale?: string | number | null;
}

// --- 4. PEDIDOS E CLIENTES ---

export interface Client {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  cnpj?: string;
  address?: string;
  created_at?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  cnpj: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price?: number;
  // Detalhes estendidos para PDF e UI
  name?: string;
  reference_code?: string;
  brand?: string;
}

export interface Order {
  id: string;
  display_id?: number; // Número sequencial amigável para o cliente (ex: #1024)
  user_id: string;
  client_id?: string | null;

  // Dados do cliente no momento da compra (Guest Checkout)
  client_name_guest?: string;
  client_phone_guest?: string;
  client_cnpj_guest?: string;

  total_value: number;
  status:
    | 'Pendente'
    | 'Confirmado'
    | 'Em Preparação'
    | 'Enviado'
    | 'Entregue'
    | 'Cancelado'
    | 'Orçamento';
  created_at: string;

  order_items?: OrderItem[];
  notes?: string;
}

// --- 5. UI E SISTEMA ---

export interface CartItem extends Product {
  quantity: number;
}

export interface BrandWithLogo {
  name: string;
  logo_url: string | null;
  banner_url?: string | null;
  description?: string | null;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message?: string;
  description?: string;
  duration?: number;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  created_at: string;
}

export interface SecurityLog {
  id: string;
  user_id?: string;
  event: string;
  details?: string;
  ip_address?: string;
  created_at: string;
  // Additional audit fields used in UI
  success?: boolean;
  timestamp?: number | string;
  action?: string;
}

// Dashboard totals shape used by validators
export interface DashboardTotals {
  total_revenue: number | string;
  total_items_sold: number | string;
}

// --- UI HELPERS ---
export interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (productId: string, quantity: number) => void;
  primaryColor?: string;
  settings?: Settings | null;
  userId?: string;
  formatPrice: (price: number) => string;
}
