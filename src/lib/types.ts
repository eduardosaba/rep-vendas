// --- TIPOS DE USUÁRIO E SAAS (Torre de Controle) ---
export type UserRole = 'master' | 'rep' | 'client_guest';
export type AccountStatus = 'active' | 'inactive' | 'blocked' | 'trial';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  status: AccountStatus;
  plan_id: string;
  license_expires_at: string;
  onboarding_completed?: boolean;
  created_at: string;
  updated_at?: string;
}

// --- TIPOS DE SEGURANÇA E LOGS ---
export interface SecurityLog {
  id: string;
  user_id?: string;
  event?: string;
  details?: string;
  ip_address?: string;
  created_at?: string;
  timestamp?: number | string;
  action?: string;
  success?: boolean;
}

// --- TIPOS DE SISTEMA (NOTIFICAÇÕES E UI) ---
export interface Toast {
  id: string;
  title: string;
  description?: string;
  message?: string;
  type: 'success' | 'error' | 'info' | 'warning';
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

// --- TIPOS DE PRODUTOS E CATÁLOGO ---
export interface Product {
  id: string;
  name: string;
  brand?: string | null;
  reference_code?: string | null;
  description?: string | null;
  price: number;
  sale_price?: number | null;
  original_price?: number | null;
  image_url?: string | null;
  image_path?: string | null;
  external_image_url?: string | null;
  images?: string[];
  slug?: string | null;
  category?: string | null;
  category_id?: string | null;
  barcode?: string | null;
  sku?: string | null;
  color?: string | null;
  bestseller?: boolean;
  is_best_seller?: boolean;
  is_launch?: boolean;
  is_active?: boolean;
  technical_specs?: string | Record<string, string> | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  cost?: number;
  stock_quantity?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// --- TIPOS DE PEDIDOS E CLIENTES ---
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  user_id: string;
  address?: string;
  created_at?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products?: Product;
}

export interface Order {
  id: string;
  display_id?: number;
  user_id: string;
  client_id?: string;
  client_name_guest?: string;
  client_email_guest?: string;
  company_name?: string;
  status:
    | 'Pendente'
    | 'Confirmado'
    | 'Em Preparação'
    | 'Enviado'
    | 'Entregue'
    | 'Completo'
    | 'Cancelado'
    | 'Orçamento';
  total_value: number;
  order_type: 'catalog' | 'manual' | 'quick_brand' | 'catalog_guest';
  delivery_address?: string;
  payment_method?: string;
  tracking_code?: string;
  estimated_delivery?: string;
  notes?: string;
  created_at: string;
  order_items?: OrderItem[];
  clients?: Client;
}

// --- TIPOS DE CONFIGURAÇÃO (SETTINGS) ---

export interface PublicCatalog {
  id: string;
  user_id: string;
  slug: string;
  store_name: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  header_background_color?: string;
  footer_background_color?: string;
  show_sale_price?: boolean;
  show_cost_price?: boolean;
  footer_message?: string;
  enable_stock_management?: boolean;
  show_installments?: boolean;
  max_installments?: number;
  show_cash_discount?: boolean;
  cash_price_discount_percent?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Campos de hash e banners na tabela pública (opcionais na interface pública se não usados diretamente)
  price_password_hash?: string;
}

export interface Settings {
  id?: string;
  user_id?: string;

  // Perfil Público
  name?: string;
  email?: string;
  phone?: string;
  support_phone?: string;
  support_email?: string;
  logo_url?: string | null;
  banner_url?: string;
  banners?: string[] | null;
  banners_mobile?: string[] | null; // Adicionado

  header_background_color?: string;
  footer_background_color?: string; // Adicionado
  footer_message?: string;

  // Top Bar (Novos Campos)
  show_top_benefit_bar?: boolean;
  show_top_info_bar?: boolean;
  top_benefit_text?: string;
  top_benefit_bg_color?: string;
  top_benefit_text_color?: string;
  top_benefit_height?: number;
  top_benefit_text_size?: number;
  top_benefit_image_url?: string | null;
  top_benefit_image_fit?: 'cover' | 'contain';
  top_benefit_image_scale?: number;

  enable_stock_management?: boolean;
  global_allow_backorder?: boolean;
  price_password?: string | null;

  // Tema
  primary_color?: string;
  secondary_color?: string;
  header_color?: string;
  font_family?: string;
  title_color?: string;
  icon_color?: string;

  // Configurações de Checkout
  show_shipping?: boolean;
  show_installments?: boolean;
  show_delivery_address?: boolean;
  show_installments_checkout?: boolean;
  show_discount?: boolean;
  show_delivery_address_checkout?: boolean;
  show_payment_method_checkout?: boolean;

  // Configurações de Catálogo
  show_old_price?: boolean;
  show_filter_price?: boolean;
  show_filter_category?: boolean;
  show_filter_bestseller?: boolean;
  show_filter_new?: boolean;

  show_cash_discount?: boolean;
  show_discount_tag?: boolean; // Alias
  cash_price_discount_percent?: number; // Pode vir como string do banco, converter

  max_installments?: number;
  show_sale_price?: boolean;
  show_cost_price?: boolean;

  // Segurança e Acesso
  catalog_price_password?: string | null;
  price_access_password?: string | null;

  catalog_slug?: string;
  slug?: string;

  // Integrações
  email_provider?: string;
  email_api_key?: string;
  email_from?: string;
}

export interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (productId: string, quantity: number) => void;
  primaryColor?: string;
  settings?: Settings | null;
  userId: string;
  formatPrice: (price: number) => string;
}

export interface DashboardTotals {
  total_revenue: number;
  total_items_sold: number;
}
