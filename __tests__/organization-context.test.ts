import { OrganizationContextService } from '../src/modules/core/organizations/organization-context-service';

describe('OrganizationContextService', () => {
  let mockSupabase: any;
  let service: OrganizationContextService;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
    };
    service = new OrganizationContextService(mockSupabase);
  });

  describe('validateOrganizationMembership', () => {
    it('deve retornar inválido se o userId ou organizationId forem ausentes', async () => {
      const result = await service.validateOrganizationMembership('', 'org-123');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('ausente');
    });

    it('deve retornar inválido se a organização não for encontrada ou estiver inativa', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await service.validateOrganizationMembership('user-1', 'org-999');
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('não encontrada');
    });

    it('deve validar com sucesso se o usuário for Master da plataforma', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 'org-100', name: 'Distribuidora Alpha', slug: 'alpha', organization_type: 'distributor', is_active: true },
          error: null,
        }),
      });

      const result = await service.validateOrganizationMembership('user-master', 'org-100', true);
      expect(result.isValid).toBe(true);
      expect(result.organization?.name).toBe('Distribuidora Alpha');
      expect(result.organization?.can_sell).toBe(true);
    });

    it('deve calcular corretamente as capacidades para catalog_template (não comercial)', async () => {
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 'org-tmpl', name: 'Catálogo Mestre de Ótica', slug: 'template', organization_type: 'catalog_template', is_active: true },
              error: null,
            }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { role: 'owner', status: 'active' },
              error: null,
            }),
          };
        }
        return {};
      });

      const result = await service.validateOrganizationMembership('user-template', 'org-tmpl', false);
      expect(result.isValid).toBe(true);
      expect(result.organization?.is_template_catalog).toBe(true);
      expect(result.organization?.can_sell).toBe(false);
      expect(result.organization?.can_buy).toBe(false);
      expect(result.organization?.can_receive_orders).toBe(false);
    });
  });
});
