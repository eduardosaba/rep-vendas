import { createClient } from '@/lib/supabase/server';
import type {
  Product,
  ProductInsert,
  ProductUpdate,
  Brand,
  BrandInsert,
  Category,
  CategoryInsert,
  PaginatedResult,
  ProductFilters,
} from './types';

export class ProductRepository {
  private async getSupabase() {
    return createClient();
  }

  // ========================================================================================
  // PRODUCTS
  // ========================================================================================

  async findById(id: string, organizationId?: string): Promise<Product | null> {
    const supabase = await this.getSupabase();
    let query = supabase.from('products').select('*').eq('id', id);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  async findBySlug(slug: string, organizationId?: string): Promise<Product | null> {
    const supabase = await this.getSupabase();
    let query = supabase.from('products').select('*').eq('slug', slug);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  async listPaginated(
    organizationId: string,
    filters: ProductFilters = {}
  ): Promise<PaginatedResult<Product>> {
    const supabase = await this.getSupabase();
    const page = filters.page || 1;
    const pageSize = filters.page_size || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    // Aplicar filtros
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,reference_code.ilike.%${filters.search}%,brand.ilike.%${filters.search}%`);
    }
    if (filters.brand_id) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filters.brand_id);
      if (isUuid) {
        const { data: brandObj } = await supabase
          .from('brands')
          .select('name')
          .eq('id', filters.brand_id)
          .maybeSingle();
        if (brandObj?.name) {
          query = query.eq('brand', brandObj.name);
        } else {
          query = query.eq('brand', filters.brand_id);
        }
      } else {
        query = query.eq('brand', filters.brand_id);
      }
    }
    if (filters.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters.material) {
      query = query.eq('material', filters.material);
    }
    if (filters.fotocromatico !== undefined) {
      query = query.eq('fotocromatico', filters.fotocromatico);
    }
    if (filters.polarizado !== undefined) {
      query = query.eq('polarizado', filters.polarizado);
    }
    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }
    if (filters.is_launch !== undefined) {
      query = query.eq('is_launch', filters.is_launch);
    }
    if (filters.tipo_montagem) {
      query = query.eq('tipo_montagem', filters.tipo_montagem);
    }
    if (filters.is_destaque !== undefined) {
      query = query.eq('is_destaque', filters.is_destaque);
    }
    if (filters.min_price !== undefined) {
      query = query.gte('price', filters.min_price);
    }
    if (filters.max_price !== undefined) {
      query = query.lte('price', filters.max_price);
    }
    if (filters.in_stock) {
      query = query.gt('stock_quantity', 0);
    }

    // Ordenação
    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Paginação
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  async listAll(organizationId: string, activeOnly = true): Promise<Product[]> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from('products')
      .select('*')
      .eq('organization_id', organizationId);

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    query = query.order('name', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async create(product: ProductInsert): Promise<Product> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createMany(products: ProductInsert[]): Promise<Product[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('products')
      .insert(products)
      .select();

    if (error) throw error;
    return data || [];
  }

  async update(id: string, updates: ProductUpdate, organizationId?: string): Promise<Product> {
    const supabase = await this.getSupabase();
    let query = supabase.from('products').update(updates).eq('id', id);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const supabase = await this.getSupabase();
    let query = supabase.from('products').delete().eq('id', id);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { error } = await query;
    if (error) throw error;
  }

  async cloneProduct(input: {
    sourceProductId: string;
    targetOrganizationId: string;
    clonedByUserId: string;
    overrides?: Partial<ProductInsert>;
  }): Promise<Product> {
    const supabase = await this.getSupabase();

    // Buscar produto original
    const { data: sourceProduct, error: sourceError } = await supabase
      .from('products')
      .select('*')
      .eq('id', input.sourceProductId)
      .single();

    if (sourceError || !sourceProduct) {
      throw new Error('Produto origem não encontrado');
    }

    // Criar produto clonado
    const { id, created_at, updated_at, user_id, organization_id, company_id, ...rest } = sourceProduct;

    const clonedProduct: ProductInsert = {
      ...rest,
      user_id: input.clonedByUserId,
      organization_id: input.targetOrganizationId,
      company_id: null, // Será preenchido pelo service se necessário
      source_product_id: sourceProduct.id,
      source_organization_id: sourceProduct.organization_id,
      cloned_at: new Date().toISOString(),
      cloned_by_user_id: input.clonedByUserId,
      ...input.overrides,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(clonedProduct)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async bulkUpdatePrices(
    organizationId: string,
    updates: Array<{ id: string; price: number; sale_price?: number }>
  ): Promise<Product[]> {
    const supabase = await this.getSupabase();
    const results: Product[] = [];

    for (const update of updates) {
      const { data, error } = await supabase
        .from('products')
        .update({ price: update.price, sale_price: update.sale_price })
        .eq('id', update.id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;
      results.push(data);
    }

    return results;
  }

  async getDistinctMaterials(organizationId: string): Promise<string[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('material')
      .eq('organization_id', organizationId)
      .not('material', 'is', null);

    if (error) throw error;
    const materials = [...new Set(data?.map(d => d.material).filter(Boolean) || [])];
    return materials.sort();
  }

  async getDistinctBrands(organizationId: string): Promise<string[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('products')
      .select('brand')
      .eq('organization_id', organizationId)
      .not('brand', 'is', null);

    if (error) throw error;
    const brands = [...new Set(data?.map(d => d.brand).filter(Boolean) || [])];
    return brands.sort();
  }

  // ========================================================================================
  // BRANDS
  // ========================================================================================

  async findBrandById(id: string, organizationId?: string): Promise<Brand | null> {
    const supabase = await this.getSupabase();
    let query = supabase.from('brands').select('*').eq('id', id);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  async listBrands(organizationId: string, activeOnly = false): Promise<Brand[]> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from('brands')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createBrand(brand: BrandInsert): Promise<Brand> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('brands')
      .insert(brand)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateBrand(id: string, updates: Partial<BrandInsert>, organizationId?: string): Promise<Brand> {
    const supabase = await this.getSupabase();
    let query = supabase.from('brands').update(updates).eq('id', id);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async deleteBrand(id: string, organizationId?: string): Promise<void> {
    const supabase = await this.getSupabase();
    let query = supabase.from('brands').delete().eq('id', id);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { error } = await query;
    if (error) throw error;
  }

  // ========================================================================================
  // CATEGORIES
  // ========================================================================================

  async findCategoryById(id: string, organizationId?: string): Promise<Category | null> {
    const supabase = await this.getSupabase();
    let query = supabase.from('categories').select('*').eq('id', id);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  }

  async listCategories(organizationId: string): Promise<Category[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createCategory(category: CategoryInsert): Promise<Category> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateCategory(id: string, updates: Partial<CategoryInsert>, organizationId?: string): Promise<Category> {
    const supabase = await this.getSupabase();
    let query = supabase.from('categories').update(updates).eq('id', id);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  }

  async deleteCategory(id: string, organizationId?: string): Promise<void> {
    const supabase = await this.getSupabase();
    let query = supabase.from('categories').delete().eq('id', id);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { error } = await query;
    if (error) throw error;
  }
}

let repositoryInstance: ProductRepository | null = null;

export function getProductRepository(): ProductRepository {
  if (!repositoryInstance) {
    repositoryInstance = new ProductRepository();
  }
  return repositoryInstance;
}