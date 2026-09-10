import { provisionUserOrganization } from '@/app/admin/users/actions';

const mockAdminFrom = jest.fn();

jest.mock('@/infrastructure/supabase/admin', () => {
  return {
    getSupabaseAdmin: () => ({
      from: (table: string) => mockAdminFrom(table),
      auth: {
        admin: {
          createUser: jest.fn(),
          updateUserById: jest.fn(),
          deleteUser: jest.fn(),
        },
      },
    }),
    supabaseAdmin: {
      from: (table: string) => mockAdminFrom(table),
      auth: {
        admin: {
          createUser: jest.fn(),
          updateUserById: jest.fn(),
          deleteUser: jest.fn(),
        },
      },
    },
  };
});

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Provisionamento Organizacional Idempotente e Rollback Compensatório', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
  });

  describe('1. Provisionamento de Representante Independente', () => {
    it('deve criar uma nova organização rep se não existir e vincular membro + perfil', async () => {
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { id: 'org-rep-1' }, error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { organization_id: null }, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            upsert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const result = await provisionUserOrganization({
        userId: 'user-rep-1',
        email: 'rep1@test.com',
        fullName: 'Carlos Rep',
        companyId: null,
      });

      expect(result.success).toBe(true);
      expect(result.organizationId).toBe('org-rep-1');
    });
  });

  describe('2. Provisionamento de Usuário com Empresa (Distribuidora)', () => {
    it('deve vincular a organização de distribuidora já existente com role sales_rep e atualizar profiles.organization_id', async () => {
      const companyId = 'company-dist-100';
      const existingDistOrgId = 'org-dist-100';
      const memberUpsertMock = jest.fn().mockResolvedValue({ error: null });
      const profileUpdateMock = jest.fn().mockResolvedValue({ error: null });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnValue({
              filter: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: existingDistOrgId }, error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { organization_id: null }, error: null }),
              }),
            }),
            update: jest.fn().mockImplementation((updates: any) => ({
              eq: jest.fn().mockImplementation((col: string, val: string) => {
                profileUpdateMock(updates, val);
                return Promise.resolve({ error: null });
              }),
            })),
          };
        }
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            upsert: jest.fn().mockImplementation((data: any) => memberUpsertMock(data)),
          };
        }
        return {};
      });

      const result = await provisionUserOrganization({
        userId: 'user-dist-1',
        email: 'vendedor@distribuidora.com',
        fullName: 'Vendedor Alpha',
        companyId,
      });

      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(existingDistOrgId);
      expect(memberUpsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: existingDistOrgId,
          user_id: 'user-dist-1',
          role: 'sales_rep',
          status: 'active',
        })
      );
      expect(profileUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ organization_id: existingDistOrgId }),
        'user-dist-1'
      );
    });

    it('deve criar a organização distributor com owner_user_id: null e metadata.company_id correto se a empresa ainda não possuir organização', async () => {
      const companyId = 'company-new-200';
      const createdOrgId = 'org-created-200';
      const insertOrgMock = jest.fn();
      const memberUpsertMock = jest.fn().mockResolvedValue({ error: null });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnValue({
              filter: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
            insert: jest.fn().mockImplementation((payload: any) => {
              insertOrgMock(payload);
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: { id: createdOrgId }, error: null }),
                }),
              };
            }),
          };
        }
        if (table === 'companies') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { name: 'Ótica Distribuidora Beta', slug: 'otica-beta' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { organization_id: null }, error: null }),
              }),
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            upsert: jest.fn().mockImplementation((data: any) => memberUpsertMock(data)),
          };
        }
        return {};
      });

      const result = await provisionUserOrganization({
        userId: 'user-dist-2',
        email: 'admin@opticabeta.com',
        fullName: 'Admin Beta',
        companyId,
      });

      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(createdOrgId);

      // Validação estrita da criação da organização distributor
      expect(insertOrgMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ótica Distribuidora Beta',
          organization_type: 'distributor',
          owner_user_id: null,
          status: 'active',
          is_active: true,
          metadata: { company_id: companyId },
        })
      );

      // Validação de membership e role
      expect(memberUpsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: createdOrgId,
          user_id: 'user-dist-2',
          role: 'sales_rep',
          status: 'active',
        })
      );
    });
  });

  describe('3. Idempotência do Provisionamento Organizacional', () => {
    it('deve re-executar a rotina para um usuário já provisionado sem criar org/membros duplicados', async () => {
      const existingOrgId = 'org-existing-123';

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnValue({
              filter: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: existingOrgId }, error: null }),
              }),
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: existingOrgId }, error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { organization_id: existingOrgId }, error: null }),
              }),
            }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 'mem-1', role: 'sales_rep', status: 'active', updated_at: '2026-01-01T00:00:00Z' },
                    error: null,
                  }),
                }),
              }),
            }),
            upsert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      });

      const result = await provisionUserOrganization({
        userId: 'user-existing-1',
        email: 'existing@distribuidora.com',
        fullName: 'Usuário Existente',
        companyId: 'company-abc',
      });

      expect(result.success).toBe(true);
      expect(result.organizationId).toBe(existingOrgId);
    });
  });

  describe('4. Rollback Compensatório com Restauração de Estado Pré-Existente', () => {
    it('deve restaurar o estado de organization_members pré-existente e profiles.organization_id se a mutação posterior falhar', async () => {
      const targetOrgId = 'org-target-99';
      const updateProfileMock = jest.fn().mockResolvedValue({ error: new Error('Erro ao atualizar perfil com a organização') });
      const updateMemberMock = jest.fn().mockResolvedValue({ error: null });
      const revertProfileMock = jest.fn().mockResolvedValue({ error: null });

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'organizations') {
          return {
            select: jest.fn().mockReturnValue({
              filter: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { id: targetOrgId }, error: null }),
              }),
            }),
          };
        }
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({ data: { organization_id: null }, error: null }),
              }),
            }),
            update: jest.fn().mockImplementation((data: any) => {
              if (data.organization_id === targetOrgId) {
                return { eq: jest.fn().mockImplementation(() => updateProfileMock()) };
              }
              return { eq: jest.fn().mockImplementation(() => revertProfileMock()) };
            }),
          };
        }
        if (table === 'organization_members') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: {
                      id: 'mem-99',
                      role: 'old_role',
                      status: 'active',
                      updated_at: '2026-01-01T00:00:00Z',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
            upsert: jest.fn().mockResolvedValue({ error: null }),
            update: jest.fn().mockImplementation((updates: any) => {
              updateMemberMock(updates);
              return {
                eq: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({ error: null }),
                }),
              };
            }),
          };
        }
        return {};
      });

      await expect(
        provisionUserOrganization({
          userId: 'user-rollback-1',
          email: 'test@rollback.com',
          companyId: 'company-99',
        })
      ).rejects.toThrow('Falha ao atualizar perfil com a organização');

      // Verifica se o rollback compensatório restaurou o estado do membro pré-existente
      expect(updateMemberMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'old_role',
          status: 'active',
        })
      );
    });
  });
});
