import { ProductService } from '@/domain/catalog/ProductService';
import { getProductRepository } from '@/domain/catalog/ProductRepository';
import { getOrganizationContextService } from '@/domain/organizations/OrganizationContextService';
import { parseCSV } from '@/lib/csv-parser';

// Mock dependencies
jest.mock('@/domain/catalog/ProductRepository');
jest.mock('@/domain/organizations/OrganizationContextService');
jest.mock('@/lib/csv-parser');

const mockRepo = {
  findById: jest.fn(),
  listPaginated: jest.fn(),
  listAll: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  cloneProduct: jest.fn(),
  bulkUpdatePrices: jest.fn(),
  listBrands: jest.fn(),
  createBrand: jest.fn(),
  updateBrand: jest.fn(),
  deleteBrand: jest.fn(),
  listCategories: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  getDistinctMaterials: jest.fn(),
  getDistinctBrands: jest.fn(),
};

const mockOrgService = {
  resolveOrganizationContext: jest.fn(),
  isFeatureEnabled: jest.fn(),
  getOrganizationById: jest.fn(),
};

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(() => {
    jest.clearAllMocks();
    (getProductRepository as jest.Mock).mockReturnValue(mockRepo);
    (getOrganizationContextService as jest.Mock).mockReturnValue(mockOrgService);
    service = new ProductService();
  });

  const mockContext = {
    organizationId: 'org-1',
    organization: { id: 'org-1', organization_type: 'independent_representative' },
    organizationType: 'independent_representative',
    memberRole: 'owner',
    memberStatus: 'active',
    permissions: ['manage_catalog', 'manage_own_catalog'],
    memberships: [],
    fallback: 'membership',
  };

  describe('listProducts', () => {
    it('returns paginated products for user org', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      mockRepo.listPaginated.mockResolvedValue({
        data: [{ id: '1', name: 'Product 1' }],
        count: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });

      const result = await service.listProducts('user-1', { page: 1, page_size: 20 });

      expect(result.data).toHaveLength(1);
      expect(mockRepo.listPaginated).toHaveBeenCalledWith('org-1', expect.any(Object));
    });

    it('throws if user has no organization', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue({
        ...mockContext,
        organizationId: null,
      });

      await expect(service.listProducts('user-1')).rejects.toThrow('Usuário sem organização ativa');
    });
  });

  describe('createProduct', () => {
    it('creates product with user_id and organization_id', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      const newProduct = { id: 'new-1', name: 'New Product', organization_id: 'org-1', user_id: 'user-1' };
      mockRepo.create.mockResolvedValue(newProduct);

      const result = await service.createProduct('user-1', { name: 'New Product', price: 100 });

      expect(result).toEqual(newProduct);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Product',
        price: 100,
        user_id: 'user-1',
        organization_id: 'org-1',
      }));
    });

    it('throws if no permission', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue({
        ...mockContext,
        permissions: ['view_catalog'],
      });

      await expect(service.createProduct('user-1', { name: 'Test' })).rejects.toThrow('Sem permissão');
    });
  });

  describe('updateProduct', () => {
    it('updates product without changing organization_id', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      const updated = { id: '1', name: 'Updated', price: 150 };
      mockRepo.update.mockResolvedValue(updated);

      const result = await service.updateProduct('user-1', '1', { name: 'Updated', price: 150, organization_id: 'org-2' });

      expect(result).toEqual(updated);
      // organization_id should be stripped from updates
      expect(mockRepo.update).toHaveBeenCalledWith('1', expect.not.objectContaining({ organization_id: expect.any(String) }), 'org-1');
    });
  });

  describe('deleteProduct', () => {
    it('deletes product if user has permission', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      mockRepo.delete.mockResolvedValue(undefined);

      await service.deleteProduct('user-1', '1');

      expect(mockRepo.delete).toHaveBeenCalledWith('1', 'org-1');
    });

    it('throws if user lacks delete permission', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue({
        ...mockContext,
        permissions: ['view_catalog'],
      });

      await expect(service.deleteProduct('user-1', '1')).rejects.toThrow('Apenas proprietários');
    });
  });

  describe('importProducts', () => {
    it('parses CSV and creates products', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      (parseCSV as jest.Mock).mockReturnValue([
        { name: 'Product 1', price: '100', brand: 'Brand A' },
        { name: 'Product 2', price: '200', brand: 'Brand B' },
      ]);
      mockRepo.createMany.mockResolvedValue([
        { id: '1', name: 'Product 1', organization_id: 'org-1' },
        { id: '2', name: 'Product 2', organization_id: 'org-1' },
      ]);

      const result = await service.importProducts('user-1', 'csv content', 'csv');

      expect(result.success).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(mockRepo.createMany).toHaveBeenCalled();
    });

    it('handles row errors gracefully', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      (parseCSV as jest.Mock).mockReturnValue([
        { name: 'Product 1', price: '100' },
        { price: '200' }, // missing name
      ]);
      mockRepo.createMany.mockResolvedValue([
        { id: '1', name: 'Product 1', organization_id: 'org-1' },
      ]);

      const result = await service.importProducts('user-1', 'csv content', 'csv');

      expect(result.success).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('obrigatório');
    });
  });

  describe('cloneFromTemplate', () => {
    it('clones from catalog_template organization', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      mockOrgService.isFeatureEnabled.mockResolvedValue(true);
      mockOrgService.getOrganizationById.mockResolvedValue({
        id: 'template-org',
        organization_type: 'catalog_template',
      });
      mockRepo.findById.mockResolvedValue({ id: 'source-1', organization_id: 'template-org' });
      mockRepo.cloneProduct.mockResolvedValue({ id: 'cloned-1', organization_id: 'org-1' });

      const result = await service.cloneFromTemplate('user-1', {
        sourceProductId: 'source-1',
        targetOrganizationId: 'org-1',
        clonedByUserId: 'user-1',
      });

      expect(result.id).toBe('cloned-1');
      expect(mockRepo.cloneProduct).toHaveBeenCalled();
    });

    it('throws if feature flag disabled', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      mockOrgService.isFeatureEnabled.mockResolvedValue(false);

      await expect(service.cloneFromTemplate('user-1', {
        sourceProductId: 'source-1',
        targetOrganizationId: 'org-1',
        clonedByUserId: 'user-1',
      })).rejects.toThrow('desabilitada');
    });

    it('throws if source not from catalog_template', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      mockOrgService.isFeatureEnabled.mockResolvedValue(true);
      mockOrgService.getOrganizationById.mockResolvedValue({
        id: 'other-org',
        organization_type: 'independent_representative',
      });
      mockRepo.findById.mockResolvedValue({ id: 'source-1', organization_id: 'other-org' });

      await expect(service.cloneFromTemplate('user-1', {
        sourceProductId: 'source-1',
        targetOrganizationId: 'org-1',
        clonedByUserId: 'user-1',
      })).rejects.toThrow('não pertence a um catálogo modelo');
    });
  });

  describe('Brand operations', () => {
    it('listBrands returns brands for user org', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      mockRepo.listBrands.mockResolvedValue([{ id: '1', name: 'Brand A' }]);

      const result = await service.listBrands('user-1');

      expect(result).toHaveLength(1);
      expect(mockRepo.listBrands).toHaveBeenCalledWith('org-1');
    });
  });

  describe('Category operations', () => {
    it('listCategories returns categories for user org', async () => {
      mockOrgService.resolveOrganizationContext.mockResolvedValue(mockContext);
      mockRepo.listCategories.mockResolvedValue([{ id: '1', name: 'Category A' }]);

      const result = await service.listCategories('user-1');

      expect(result).toHaveLength(1);
      expect(mockRepo.listCategories).toHaveBeenCalledWith('org-1');
    });
  });
});