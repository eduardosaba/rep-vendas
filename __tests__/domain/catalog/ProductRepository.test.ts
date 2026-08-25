import { ProductRepository } from '@/domain/catalog/ProductRepository';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

// Create a fully chainable mock that mimics Supabase query builder
// Chainable methods return `this` for chaining
// Terminal methods return Promises
const createChainableMock = (terminalResults: any = {}) => {
  const chainableMethods = [
    'select', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 
    'like', 'ilike', 'in', 'or', 'order', 'range', 'limit',
    'insert', 'update', 'delete',
  ];
  
  const terminalMethods = [
    'single', 'maybeSingle', 'rpc',
  ];
  
  const chain: any = {};
  
  // Chainable methods return `this` for chaining
  chainableMethods.forEach(method => {
    chain[method] = jest.fn().mockReturnThis();
  });
  
  // Terminal methods return Promises with results
  terminalMethods.forEach(method => {
    chain[method] = jest.fn().mockResolvedValue(terminalResults[method] || { data: null, error: null });
  });
  
  // Make it thenable for async/await
  chain.then = jest.fn((resolve) => resolve(terminalResults.select || { data: [], count: 0, error: null }));
  
  return chain;
};

const mockSupabase = {
  from: jest.fn(() => createChainableMock({})),
  rpc: jest.fn().mockResolvedValue({ data: 0, error: null }),
};

describe('ProductRepository', () => {
  let repository: ProductRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    repository = new ProductRepository();
  });

  const mockProduct = {
    id: 'prod-1',
    name: 'Test Product',
    reference_code: 'REF-001',
    brand: 'Test Brand',
    price: 100,
    organization_id: 'org-1',
    user_id: 'user-1',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const createMockChain = (overrides: any = {}) => {
    return createChainableMock({
      single: overrides.single || { data: mockProduct, error: null },
      maybeSingle: overrides.maybeSingle || { data: mockProduct, error: null },
      select: overrides.select || { data: [mockProduct], count: 1, error: null },
      insert: overrides.insert || { data: mockProduct, error: null },
      update: overrides.update || { data: mockProduct, error: null },
      delete: overrides.delete || { error: null },
      rpc: overrides.rpc || { data: 0, error: null },
      ...overrides,
    });
  };

  describe('findById', () => {
    it('returns product when found', async () => {
      const chain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(chain);

      const result = await repository.findById('prod-1', 'org-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('products');
      expect(result).toEqual(mockProduct);
    });

    it('returns null when not found', async () => {
      const chain = createMockChain({ maybeSingle: { data: null, error: null } });
      mockSupabase.from.mockReturnValueOnce(chain);

      const result = await repository.findById('prod-999', 'org-1');
      expect(result).toBeNull();
    });

    it('throws on database error', async () => {
      const chain = createMockChain({ 
        maybeSingle: { data: null, error: { message: 'DB error' } } 
      });
      // Override maybeSingle to reject
      chain.maybeSingle.mockRejectedValue(new Error('DB error'));
      mockSupabase.from.mockReturnValueOnce(chain);

      await expect(repository.findById('prod-1', 'org-1')).rejects.toThrow('DB error');
    });
  });

  describe('listPaginated', () => {
    it('returns paginated results', async () => {
      const chain = createMockChain({ 
        select: { data: [mockProduct], count: 1, error: null } 
      });
      mockSupabase.from.mockReturnValueOnce(chain);

      const result = await repository.listPaginated('org-1', { page: 1, page_size: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.count).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('applies filters correctly', async () => {
      const chain = createMockChain({ 
        select: { data: [], count: 0, error: null } 
      });
      mockSupabase.from.mockReturnValueOnce(chain);

      await repository.listPaginated('org-1', {
        search: 'test',
        brand_id: 'brand-1',
        is_active: true,
        sort_by: 'price',
        sort_order: 'desc',
        page: 2,
        page_size: 10,
      });

      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(chain.or).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('brand_id', 'brand-1');
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
      expect(chain.order).toHaveBeenCalledWith('price', { ascending: false });
      expect(chain.range).toHaveBeenCalledWith(10, 19);
    });
  });

  describe('create', () => {
    it('creates product and returns it', async () => {
      const chain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(chain);

      const result = await repository.create({
        name: 'New Product',
        reference_code: 'NEW-001',
        user_id: 'user-1',
        organization_id: 'org-1',
      });

      expect(result).toEqual(mockProduct);
      expect(chain.insert).toHaveBeenCalled();
      expect(chain.select).toHaveBeenCalled();
      expect(chain.single).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates product with organization scoping', async () => {
      const chain = createMockChain({ 
        single: { data: { ...mockProduct, name: 'Updated' }, error: null } 
      });
      mockSupabase.from.mockReturnValueOnce(chain);

      const result = await repository.update('prod-1', { name: 'Updated' }, 'org-1');

      expect(result.name).toBe('Updated');
      expect(chain.update).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'prod-1');
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(chain.select).toHaveBeenCalled();
      expect(chain.single).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes product with organization scoping', async () => {
      const chain = createMockChain();
      mockSupabase.from.mockReturnValueOnce(chain);

      await repository.delete('prod-1', 'org-1');

      expect(chain.delete).toHaveBeenCalled();
      expect(chain.eq).toHaveBeenCalledWith('id', 'prod-1');
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    });
  });

  describe('cloneProduct', () => {
    it('clones product to target organization', async () => {
      const sourceProduct = { ...mockProduct, id: 'source-1', organization_id: 'template-org' };
      const clonedProduct = { ...mockProduct, id: 'cloned-1', organization_id: 'target-org', source_product_id: 'source-1', cloned_by_user_id: 'user-1' };
      
      const findChain = createMockChain({ single: { data: sourceProduct, error: null } });
      const insertChain = createMockChain({ single: { data: clonedProduct, error: null } });
      
      mockSupabase.from
        .mockReturnValueOnce(findChain)  // find source
        .mockReturnValueOnce(insertChain); // insert clone

      const result = await repository.cloneProduct({
        sourceProductId: 'source-1',
        targetOrganizationId: 'target-org',
        clonedByUserId: 'user-1',
      });

      expect(result.id).toBe('cloned-1');
      expect(result.organization_id).toBe('target-org');
      expect(result.source_product_id).toBe('source-1');
      expect(result.cloned_by_user_id).toBe('user-1');
    });
  });

  describe('Brand operations', () => {
    it('listBrands filters by organization', async () => {
      const mockBrands = [{ id: 'brand-1', name: 'Brand A', organization_id: 'org-1' }];
      const chain = createMockChain({ select: { data: mockBrands, error: null } });
      mockSupabase.from.mockReturnValueOnce(chain);

      const result = await repository.listBrands('org-1');
      expect(result).toEqual(mockBrands);
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(chain.order).toHaveBeenCalledWith('name', { ascending: true });
    });
  });

  describe('Category operations', () => {
    it('listCategories filters by organization', async () => {
      const mockCategories = [{ id: 'cat-1', name: 'Category A', organization_id: 'org-1' }];
      const chain = createMockChain({ select: { data: mockCategories, error: null } });
      mockSupabase.from.mockReturnValueOnce(chain);

      const result = await repository.listCategories('org-1');
      expect(result).toEqual(mockCategories);
      expect(chain.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(chain.order).toHaveBeenCalledWith('name', { ascending: true });
    });
  });
});