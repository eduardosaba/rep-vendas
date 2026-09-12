import type { CompanyPageContent, CompanyPageBlock } from './company-page-content';

export interface ResolvedProduct {
  id: string;
  name: string;
  price?: number;
  image_url?: string | null;
  brand_name?: string | null;
  category_name?: string | null;
  is_launch?: boolean;
  is_featured?: boolean;
}

export interface ResolvedBrand {
  id: string;
  name: string;
  logo_url?: string | null;
}

export interface ResolvedDynamicData {
  products: Record<string, ResolvedProduct[]>;
  brands: Record<string, ResolvedBrand[]>;
  availableBrands?: Array<{ id: string; name: string }>;
  availableCategories?: Array<{ id: string; name: string }>;
}

export async function resolveCompanyPageDynamicData(
  content: CompanyPageContent,
  tenantId: string,
  supabase: any
): Promise<ResolvedDynamicData> {
  const result: ResolvedDynamicData = {
    products: {},
    brands: {},
    availableBrands: [],
    availableCategories: [],
  };

  if (!tenantId || !supabase) return result;

  try {
    // 1. Buscar Marcas e Categorias da Empresa (para popularem dropdowns e filtros)
    const [{ data: dbBrands }, { data: dbCategories }] = await Promise.all([
      supabase
        .from('brands')
        .select('id, name, logo_url')
        .or(`organization_id.eq.${tenantId},company_id.eq.${tenantId}`)
        .order('name', { ascending: true }),
      supabase
        .from('categories')
        .select('id, name')
        .or(`organization_id.eq.${tenantId},company_id.eq.${tenantId}`)
        .order('name', { ascending: true }),
    ]);

    result.availableBrands = Array.isArray(dbBrands) ? dbBrands : [];
    result.availableCategories = Array.isArray(dbCategories) ? dbCategories : [];

    const productBlocks = content.blocks.filter((b) => b.type === 'products');
    const brandBlocks = content.blocks.filter((b) => b.type === 'brands');

    // 2. Processar blocos de Marcas
    for (const block of brandBlocks) {
      const source = block.data.brandsSource || 'company';
      const manualIds = Array.isArray(block.data.brandIds) ? block.data.brandIds : [];

      if (source === 'manual' && manualIds.length > 0) {
        const { data: matched } = await supabase
          .from('brands')
          .select('id, name, logo_url')
          .or(`organization_id.eq.${tenantId},company_id.eq.${tenantId}`)
          .in('id', manualIds);

        const map = new Map<string, ResolvedBrand>();
        (matched || []).forEach((b: any) => map.set(String(b.id), b));

        // Preservar ordem manual definida pelo usuário
        const ordered: ResolvedBrand[] = [];
        for (const id of manualIds) {
          const item = map.get(id);
          if (item) ordered.push(item);
        }
        result.brands[block.id] = ordered;
      } else {
        // 'company' (todas as marcas da empresa/organização atual)
        result.brands[block.id] = Array.isArray(dbBrands) ? dbBrands : [];
      }
    }

    // 3. Processar blocos de Produtos
    for (const block of productBlocks) {
      const source = block.data.productsSource || 'featured';
      const limit = Math.max(4, Math.min(24, Number(block.data.productsLimit || 8)));
      const brandId = block.data.productsBrandId;
      const categoryId = block.data.productsCategoryId;
      const manualIds = Array.isArray(block.data.productIds) ? block.data.productIds : [];

      // Validação de dependências obrigatórias
      if (source === 'brand' && !brandId) {
        result.products[block.id] = [];
        continue;
      }
      if (source === 'category' && !categoryId) {
        result.products[block.id] = [];
        continue;
      }
      if (source === 'manual' && manualIds.length === 0) {
        result.products[block.id] = [];
        continue;
      }

      let query = supabase
        .from('products')
        .select('id, name, price, image_url, is_featured, is_launch, created_at, brand_id, category_id')
        .or(`organization_id.eq.${tenantId},company_id.eq.${tenantId}`);

      if (source === 'featured') {
        query = query.eq('is_featured', true).limit(limit);
      } else if (source === 'launches') {
        // Filtra obrigatoriamente por is_launch = true, com created_at desc como ordenação secundária
        query = query.eq('is_launch', true).order('created_at', { ascending: false }).limit(limit);
      } else if (source === 'brand') {
        query = query.eq('brand_id', brandId).limit(limit);
      } else if (source === 'category') {
        query = query.eq('category_id', categoryId).limit(limit);
      } else if (source === 'manual') {
        query = query.in('id', manualIds);
      }

      const { data: rawProducts } = await query;
      const productsList: ResolvedProduct[] = (rawProducts || []).map((p: any) => ({
        id: String(p.id),
        name: String(p.name || ''),
        price: typeof p.price === 'number' ? p.price : undefined,
        image_url: p.image_url || null,
        is_launch: Boolean(p.is_launch),
        is_featured: Boolean(p.is_featured),
      }));

      if (source === 'manual') {
        const map = new Map<string, ResolvedProduct>();
        productsList.forEach((p) => map.set(p.id, p));

        const ordered: ResolvedProduct[] = [];
        for (const id of manualIds) {
          const p = map.get(id);
          if (p) ordered.push(p);
        }
        result.products[block.id] = ordered;
      } else {
        result.products[block.id] = productsList;
      }
    }
  } catch (error) {
    console.error('Erro ao resolver dados dinâmicos da página:', error);
  }

  return result;
}
