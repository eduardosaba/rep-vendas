export interface Product {
  id: string;
  reference_code: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  brand_id: string | null;
  price: number | null;
  sale_price: number | null;
  cost: number | null;
  image_url: string | null;
  images: string[] | null;
  gallery_images: any[] | null;
  user_id: string;
  organization_id: string | null;
  company_id: string | null;
  category_id: string | null;
  category: string | null;
  is_active: boolean;
  is_launch: boolean;
  is_destaque: boolean;
  is_best_seller: boolean;
  bestseller: boolean;
  track_stock: boolean;
  stock_quantity: number | null;
  min_stock_level: number | null;
  manage_stock: boolean;
  sku: string | null;
  barcode: string | null;
  color: string | null;
  material: string | null;
  fotocromatico: boolean | null;
  polarizado: boolean | null;
  material_haste: string | null;
  colecao: string | null;
  frame_formato: string | null;
  color_nome: string | null;
  tipo_montagem: string | null;
  gender: string | null;
  technical_specs: Record<string, any> | null;
  original_product_id: string | null;
  original_size_kb: number | null;
  optimized_size_kb: number | null;
  class_core: string | null;
  image_variants: any[] | null;
  linked_images: string[] | null;
  reference_id: string | null;
  source_product_id: string | null;
  source_organization_id: string | null;
  cloned_at: string | null;
  cloned_by_user_id: string | null;
  created_at: string;
  updated_at: string | null;
  slug: string | null;
  discount_percent: number | null;
  original_price: number | null;
  external_image_url: string | null;
  image_path: string | null;
  short_id: string | null;
  last_import_id: string | null;
  sync_status: string | null;
  sync_error: string | null;
  image_is_shared: boolean | null;
  image_optimized: boolean | null;
}

export interface ProductInsert {
  reference_code?: string;
  name: string;
  description?: string;
  brand?: string;
  brand_id?: string;
  price?: number;
  sale_price?: number;
  cost?: number;
  image_url?: string;
  images?: string[];
  user_id: string;
  organization_id?: string;
  company_id?: string;
  category_id?: string;
  category?: string;
  is_active?: boolean;
  is_launch?: boolean;
  is_destaque?: boolean;
  is_best_seller?: boolean;
  track_stock?: boolean;
  stock_quantity?: number;
  min_stock_level?: number;
  manage_stock?: boolean;
  sku?: string;
  barcode?: string;
  color?: string;
  material?: string;
  fotocromatico?: boolean;
  polarizado?: boolean;
  material_haste?: string;
  colecao?: string;
  frame_formato?: string;
  color_nome?: string;
  tipo_montagem?: string;
  gender?: string;
  technical_specs?: Record<string, any>;
}

export interface ProductUpdate extends Partial<ProductInsert> {
  id: string;
}

export interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  logo_path: string | null;
  banner_url: string | null;
  banner_path: string | null;
  banner_meta: Record<string, any> | null;
  banner_variants: any[] | null;
  description: string | null;
  commission_percent: number | null;
  user_id: string;
  organization_id: string | null;
  company_id: string | null;
  profile_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BrandInsert {
  name: string;
  logo_url?: string;
  logo_path?: string;
  banner_url?: string;
  banner_path?: string;
  description?: string;
  commission_percent?: number;
  user_id: string;
  organization_id?: string;
  company_id?: string;
  profile_id?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  image_url: string | null;
  color: string | null;
  user_id: string;
  organization_id: string | null;
  company_id: string | null;
  profile_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CategoryInsert {
  name: string;
  description?: string;
  icon_url?: string;
  image_url?: string;
  color?: string;
  user_id: string;
  organization_id?: string;
  company_id?: string;
  profile_id?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductFilters {
  search?: string;
  brand_id?: string;
  category_id?: string;
  material?: string;
  fotocromatico?: boolean;
  polarizado?: boolean;
  is_active?: boolean;
  is_launch?: boolean;
  is_destaque?: boolean;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort_by?: 'name' | 'price' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

export interface CloneProductInput {
  sourceProductId: string;
  targetOrganizationId: string;
  clonedByUserId: string;
  overrides?: Partial<ProductInsert>;
}

export interface ImportProductsResult {
  success: number;
  errors: Array<{ row: number; error: string; data: any }>;
}