import { getProductRepository } from './ProductRepository';
import { getOrganizationContextService } from '@/domain/organizations/OrganizationContextService';
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
  CloneProductInput,
  ImportProductsResult,
} from './types';
import { parseCSV } from '@/lib/csv-parser';
import * as XLSX from 'xlsx';

export class ProductService {
  private repo = getProductRepository();
  private orgService = getOrganizationContextService();

  // ========================================================================================
  // PRODUCTS
  // ========================================================================================

  async getProduct(id: string, userId: string): Promise<Product | null> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }
    return this.repo.findById(id, context.organizationId);
  }

  async listProducts(
    userId: string,
    filters: ProductFilters = {}
  ): Promise<PaginatedResult<Product>> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }
    return this.repo.listPaginated(context.organizationId, filters);
  }

  async createProduct(userId: string, product: Omit<ProductInsert, 'user_id' | 'organization_id'>): Promise<Product> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    // Verificar permissão
    if (!context.permissions.includes('manage_catalog') && !context.permissions.includes('manage_own_catalog')) {
      throw new Error('Sem permissão para criar produtos');
    }

    const productInsert: ProductInsert = {
      ...product,
      user_id: userId,
      organization_id: context.organizationId,
      company_id: context.organization?.owner_user_id ? undefined : context.fallback === 'legacy_company' ? context.organizationId : undefined,
    };

    return this.repo.create(productInsert);
  }

  async updateProduct(userId: string, id: string, updates: ProductUpdate): Promise<Product> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    // Verificar permissão
    if (!context.permissions.includes('manage_catalog') && !context.permissions.includes('manage_own_catalog')) {
      throw new Error('Sem permissão para atualizar produtos');
    }

    // Não permitir alterar organization_id
    const { organization_id, user_id, ...safeUpdates } = updates;
    return this.repo.update(id, safeUpdates, context.organizationId);
  }

  async deleteProduct(userId: string, id: string): Promise<void> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    // Apenas owner/admin pode deletar
    if (!context.permissions.includes('manage_organization') && !context.permissions.includes('manage_catalog')) {
      throw new Error('Apenas proprietários/administradores podem excluir produtos');
    }

    return this.repo.delete(id, context.organizationId);
  }

  async bulkUpdatePrices(
    userId: string,
    updates: Array<{ id: string; price: number; sale_price?: number }>
  ): Promise<Product[]> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    if (!context.permissions.includes('manage_catalog') && !context.permissions.includes('manage_own_catalog')) {
      throw new Error('Sem permissão para atualizar preços');
    }

    return this.repo.bulkUpdatePrices(context.organizationId, updates);
  }

  // ========================================================================================
  // IMPORT PRODUCTS
  // ========================================================================================

  async importProducts(
    userId: string,
    fileContent: string | ArrayBuffer,
    fileType: 'csv' | 'xlsx'
  ): Promise<ImportProductsResult> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    if (!context.permissions.includes('manage_catalog') && !context.permissions.includes('manage_own_catalog')) {
      throw new Error('Sem permissão para importar produtos');
    }

    let rows: any[];
    if (fileType === 'csv') {
      rows = parseCSV(fileContent as string);
    } else if (fileType === 'xlsx') {
      // Parse XLSX using SheetJS
      const workbook = XLSX.read(fileContent, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rows = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        raw: false 
      });
      
      // Convert array of arrays to array of objects using first row as headers
      if (rows.length > 0) {
        const headers = rows[0].map((h: any) => String(h).toLowerCase().trim());
        rows = rows.slice(1).map((row: any[]) => {
          const obj: Record<string, string> = {};
          headers.forEach((header: string, index: number) => {
            obj[header] = row[index] ? String(row[index]).trim() : '';
          });
          return obj;
        });
      } else {
        rows = [];
      }
    } else {
      throw new Error('Tipo de arquivo não suportado. Use CSV ou XLSX.');
    }

    const results: ImportProductsResult = { success: 0, errors: [] };
    const productsToInsert: ProductInsert[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const product = this.mapRowToProduct(row, context.organizationId, userId);
        productsToInsert.push(product);
      } catch (error) {
        results.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          data: row,
        });
      }
    }

    if (productsToInsert.length > 0) {
      try {
        await this.repo.createMany(productsToInsert);
        results.success = productsToInsert.length;
      } catch (error) {
        // Se falhar em lote, tentar individualmente
        for (const product of productsToInsert) {
          try {
            await this.repo.create(product);
            results.success++;
          } catch (err) {
            results.errors.push({
              row: 0,
              error: err instanceof Error ? err.message : 'Erro ao inserir',
              data: product,
            });
          }
        }
      }
    }

    return results;
  }

  private mapRowToProduct(row: any, organizationId: string, userId: string): ProductInsert {
    // Mapear colunas CSV para campos do produto
    const mapField = (aliases: string[]) => {
      for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== '') return row[alias];
      }
      return undefined;
    };

    const name = mapField(['name', 'nome', 'produto', 'product_name']);
    if (!name) throw new Error('Nome do produto é obrigatório');

    return {
      name,
      reference_code: mapField(['reference_code', 'sku', 'codigo', 'code', 'referencia']),
      description: mapField(['description', 'descricao', 'desc']),
      brand: mapField(['brand', 'marca', 'fabricante']),
      price: mapField(['price', 'preco', 'valor', 'sale_price']) ? parseFloat(mapField(['price', 'preco', 'valor', 'sale_price'])!) : undefined,
      cost: mapField(['cost', 'custo', 'cost_price', 'preco_custo']) ? parseFloat(mapField(['cost', 'custo', 'cost_price', 'preco_custo'])!) : undefined,
      sale_price: mapField(['sale_price', 'preco_promocional', 'promo_price']) ? parseFloat(mapField(['sale_price', 'preco_promocional', 'promo_price'])!) : undefined,
      category: mapField(['category', 'categoria', 'tipo']),
      category_id: mapField(['category_id', 'categoria_id']),
      sku: mapField(['sku', 'codigo_barras', 'barcode']),
      barcode: mapField(['barcode', 'ean', 'gtin']),
      stock_quantity: mapField(['stock_quantity', 'estoque', 'quantidade', 'qty']) ? parseInt(mapField(['stock_quantity', 'estoque', 'quantidade', 'qty'])!) : undefined,
      min_stock_level: mapField(['min_stock_level', 'estoque_minimo', 'min_qty']) ? parseInt(mapField(['min_stock_level', 'estoque_minimo', 'min_qty'])!) : undefined,
      track_stock: mapField(['track_stock', 'controlar_estoque', 'manage_stock']) ? mapField(['track_stock', 'controlar_estoque', 'manage_stock']).toLowerCase() === 'true' : undefined,
      manage_stock: mapField(['manage_stock', 'gerenciar_estoque']) ? mapField(['manage_stock', 'gerenciar_estoque']).toLowerCase() === 'true' : undefined,
      is_active: mapField(['is_active', 'ativo', 'status']) ? mapField(['is_active', 'ativo', 'status']).toLowerCase() !== 'false' : true,
      is_launch: mapField(['is_launch', 'lancamento', 'launch']) ? mapField(['is_launch', 'lancamento', 'launch']).toLowerCase() === 'true' : false,
      is_destaque: mapField(['is_destaque', 'destaque', 'featured']) ? mapField(['is_destaque', 'destaque', 'featured']).toLowerCase() === 'true' : false,
      material: mapField(['material', 'material_lente']),
      fotocromatico: mapField(['fotocromatico', 'fotocromatica', 'photochromic']) ? mapField(['fotocromatico', 'fotocromatica', 'photochromic']).toLowerCase() === 'true' : undefined,
      polarizado: mapField(['polarizado', 'polarizada', 'polarized']) ? mapField(['polarizado', 'polarizada', 'polarized']).toLowerCase() === 'true' : undefined,
      gender: mapField(['gender', 'genero', 'sexo']),
      color: mapField(['color', 'cor']),
      user_id: userId,
      organization_id: organizationId,
    };
  }

  // ========================================================================================
  // CLONE FROM TEMPLATE
  // ========================================================================================

  async cloneFromTemplate(
    userId: string,
    input: CloneProductInput
  ): Promise<Product> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    // Verificar se feature flag está ativa
    const featureEnabled = await this.orgService.isFeatureEnabled(
      context.organizationId,
      'catalog_template_clone_enabled'
    );
    if (!featureEnabled) {
      throw new Error('Funcionalidade de clonagem de catálogo modelo desabilitada');
    }

    // Verificar permissão
    if (!context.permissions.includes('manage_catalog') && !context.permissions.includes('manage_own_catalog')) {
      throw new Error('Sem permissão para clonar produtos');
    }

    // Verificar se produto origem pertence a um catalog_template
    const sourceProduct = await this.repo.findById(input.sourceProductId);
    if (!sourceProduct) {
      throw new Error('Produto origem não encontrado');
    }

    if (sourceProduct.organization_id) {
      const sourceOrg = await this.orgService.getOrganizationById(sourceProduct.organization_id);
      if (sourceOrg?.organization_type !== 'catalog_template') {
        throw new Error('Produto origem não pertence a um catálogo modelo');
      }
    } else {
      throw new Error('Produto origem não tem organização definida');
    }

    // Verificar se organização alvo é a mesma do contexto (ou subordinada)
    if (input.targetOrganizationId !== context.organizationId) {
      // Permitir apenas se for owner/admin
      if (!context.permissions.includes('manage_organization')) {
        throw new Error('Não autorizado a clonar para outra organização');
      }
    }

    return this.repo.cloneProduct({
      ...input,
      clonedByUserId: userId,
    });
  }

  async cloneMultipleFromTemplate(
    userId: string,
    sourceProductIds: string[],
    targetOrganizationId?: string
  ): Promise<Product[]> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    const targetOrgId = targetOrganizationId || context.organizationId;

    if (!targetOrgId) {
      throw new Error('Organização alvo não definida');
    }

    const results: Product[] = [];
    for (const sourceId of sourceProductIds) {
      try {
        const cloned = await this.cloneFromTemplate(userId, {
          sourceProductId: sourceId,
          targetOrganizationId: targetOrgId,
          clonedByUserId: userId,
        });
        results.push(cloned);
      } catch (error) {
        console.error(`Erro ao clonar produto ${sourceId}:`, error);
        // Continuar clonando os demais
      }
    }

    return results;
  }

  // ========================================================================================
  // BRANDS
  // ========================================================================================

  async listBrands(userId: string): Promise<Brand[]> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }
    return this.repo.listBrands(context.organizationId);
  }

  async createBrand(userId: string, brand: Omit<BrandInsert, 'user_id' | 'organization_id'>): Promise<Brand> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    if (!context.permissions.includes('manage_catalog') && !context.permissions.includes('manage_own_catalog')) {
      throw new Error('Sem permissão para criar marcas');
    }

    const brandInsert: BrandInsert = {
      ...brand,
      user_id: userId,
      organization_id: context.organizationId,
    };

    return this.repo.createBrand(brandInsert);
  }

  async updateBrand(userId: string, id: string, updates: Partial<BrandInsert>): Promise<Brand> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    if (!context.permissions.includes('manage_catalog') && !context.permissions.includes('manage_own_catalog')) {
      throw new Error('Sem permissão para atualizar marcas');
    }

    const { organization_id, user_id, ...safeUpdates } = updates;
    return this.repo.updateBrand(id, safeUpdates, context.organizationId);
  }

  async deleteBrand(userId: string, id: string): Promise<void> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    if (!context.permissions.includes('manage_organization') && !context.permissions.includes('manage_catalog')) {
      throw new Error('Apenas proprietários/administradores podem excluir marcas');
    }

    return this.repo.deleteBrand(id, context.organizationId);
  }

  // ========================================================================================
  // CATEGORIES
  // ========================================================================================

  async listCategories(userId: string): Promise<Category[]> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }
    return this.repo.listCategories(context.organizationId);
  }

  async createCategory(userId: string, category: Omit<CategoryInsert, 'user_id' | 'organization_id'>): Promise<Category> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    if (!context.permissions.includes('manage_catalog') && !context.permissions.includes('manage_own_catalog')) {
      throw new Error('Sem permissão para criar categorias');
    }

    const categoryInsert: CategoryInsert = {
      ...category,
      user_id: userId,
      organization_id: context.organizationId,
    };

    return this.repo.createCategory(categoryInsert);
  }

  async updateCategory(userId: string, id: string, updates: Partial<CategoryInsert>): Promise<Category> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    if (!context.permissions.includes('manage_catalog') && !context.permissions.includes('manage_own_catalog')) {
      throw new Error('Sem permissão para atualizar categorias');
    }

    const { organization_id, user_id, ...safeUpdates } = updates;
    return this.repo.updateCategory(id, safeUpdates, context.organizationId);
  }

  async deleteCategory(userId: string, id: string): Promise<void> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }

    if (!context.permissions.includes('manage_organization') && !context.permissions.includes('manage_catalog')) {
      throw new Error('Apenas proprietários/administradores podem excluir categorias');
    }

    return this.repo.deleteCategory(id, context.organizationId);
  }

  // ========================================================================================
  // UTILITÁRIOS
  // ========================================================================================

  async getDistinctMaterials(userId: string): Promise<string[]> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }
    return this.repo.getDistinctMaterials(context.organizationId);
  }

  async getDistinctBrands(userId: string): Promise<string[]> {
    const context = await this.orgService.resolveOrganizationContext(userId);
    if (!context.organizationId) {
      throw new Error('Usuário sem organização ativa');
    }
    return this.repo.getDistinctBrands(context.organizationId);
  }

  // Backfill functions (admin only)
  async backfillProductsOrganizationId(userId: string): Promise<number> {
    const profile = await this.getProfile(userId);
    if (profile?.role !== 'master') {
      throw new Error('Apenas master pode executar backfill');
    }

    const supabase = (this.repo as any).getSupabase ? await (this.repo as any).getSupabase() : null;
    if (!supabase) throw new Error('Supabase não disponível');

    const { data, error } = await supabase.rpc('backfill_products_organization_id');
    if (error) throw error;
    return data;
  }

  private async getProfile(userId: string) {
    const supabase = (this.repo as any).getSupabase ? await (this.repo as any).getSupabase() : null;
    if (!supabase) return null;
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single();
    return data;
  }
}

let serviceInstance: ProductService | null = null;

export function getProductService(): ProductService {
  if (!serviceInstance) {
    serviceInstance = new ProductService();
  }
  return serviceInstance;
}