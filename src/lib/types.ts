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
  license_expires_at: string; // Data em formato ISO string
  onboarding_completed?: boolean; // flag para controlar fluxo de onboarding
  created_at: string;
  updated_at?: string;
}

// --- TIPOS DE SEGURANÇA E LOGS ---
export interface SecurityLog {
  id: string;
  user_id?: string;
  event?: string; // ex: 'login', 'failed_login', 'password_change'
  details?: string;
  ip_address?: string;
  created_at?: string;
  // Campos adicionais usados pelo componente de SecurityLogs
  // manter compatibilidade com formatos diferentes (timestamp numérico ou string)
  timestamp?: number | string;
  action?: string;
  success?: boolean;
}

// --- TIPOS DE SISTEMA (NOTIFICAÇÕES E UI) ---
export interface Toast {
  id: string;
  title: string;
  description?: string; // Padrão novo
  message?: string; // Mantido para compatibilidade com código antigo
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

  // --- PREÇIFICAÇÃO ---
  price: number; // PREÇO DE CUSTO (Interno)
  sale_price?: number | null; // PREÇO DE VENDA (Sugerido ao cliente)
  original_price?: number | null; // PREÇO "DE" (Para promoções/comparação)

  // --- IMAGENS ---
  image_url?: string | null; // URL da imagem principal (Capa)
  image_path?: string | null; // caminho no storage
  external_image_url?: string | null; // url externa alternativa
  images?: string[]; // Galeria de imagens

  // --- IDENTIFICADORES E ORGANIZAÇÃO ---
  slug?: string | null; // URL Amigável (ex: oculos-sol-rayban)
  category?: string | null; // Nome da categoria
  category_id?: string | null; // ID da categoria (Relação)
  barcode?: string | null;
  sku?: string | null;
  color?: string | null;

  // --- FLAGS E STATUS ---
  // Mantemos compatibilidade entre convenções diferentes (DB vs UI)
  bestseller?: boolean;
  is_best_seller?: boolean;

  is_launch?: boolean;
  is_active?: boolean; // Controla visibilidade global do produto

  // --- OUTROS ---
  technical_specs?: string | Record<string, string> | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;

  // Campos legado ou redundantes mantidos para evitar quebras
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
  products?: Product; // Para joins no Supabase
}

export interface Order {
  id: string;
  display_id?: number; // ID curto amigável (ex: 1001)
  user_id: string; // Representante dono do pedido

  // Dados do Cliente
  client_id?: string;
  client_name_guest?: string;
  client_email_guest?: string;
  company_name?: string;

  // Dados do Pedido
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

  // Detalhes de Entrega/Pagamento
  delivery_address?: string;
  payment_method?: string;
  tracking_code?: string;
  estimated_delivery?: string;
  notes?: string;

  created_at: string;
  order_items?: OrderItem[]; // Relação
  clients?: Client; // Relação
}

// --- TIPOS DE CONFIGURAÇÃO (SETTINGS) ---
export interface Settings {
  id?: string;
  user_id?: string;

  // Perfil Público
  name?: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  banner_url?: string;
  banners?: string[];
  banners_mobile?: string[];
  header_background_color?: string;
  footer_message?: string;
  show_top_benefit_bar?: boolean;
  top_benefit_text?: string;
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

  // Configurações de Catálogo (Filtros e Exibição)
  show_old_price?: boolean;
  show_filter_price?: boolean;
  show_filter_category?: boolean;
  show_filter_bestseller?: boolean;
  show_filter_new?: boolean;
  // Exibição de descontos e percentuais
  show_cash_discount?: boolean;
  cash_price_discount_percent?: number;
  // Novas opções usadas pelo catálogo
  max_installments?: number;
  show_sale_price?: boolean;
  show_cost_price?: boolean;
  show_discount_tag?: boolean;

  // Segurança e Acesso
  catalog_price_password?: string | null;
  // Nome usado em telas/inputs antigos
  price_access_password?: string | null;
  catalog_slug?: string;

  // Integrações (Futuro)
  email_provider?: string;
  email_api_key?: string;
  email_from?: string;
}

// Props esperadas pelos componentes de produto (cards)
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

// --- TIPOS DE DASHBOARD ---
export interface DashboardTotals {
  total_revenue: number;
  total_items_sold: number;
}
