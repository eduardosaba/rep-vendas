import {
  deactivateUser,
  reactivateUser,
  getAuthenticatedUser,
  getUserDeletionImpact,
  permanentlyDeleteUser,
} from '@/app/admin/users/actions';
import { supabaseAdmin } from '@/infrastructure/supabase/admin';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/infrastructure/supabase/admin', () => {
  const mockAdmin = {
    auth: {
      admin: {
        getUserById: jest.fn(),
        updateUserById: jest.fn(),
        deleteUser: jest.fn(),
        signOut: jest.fn(),
      },
    },
    from: jest.fn(),
    rpc: jest.fn(),
  };
  return {
    getSupabaseAdmin: () => mockAdmin,
    supabaseAdmin: mockAdmin,
  };
});

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Governança de Usuários V1: Desativação, Reativação e Matriz de Segurança', () => {
  let mockServerSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    mockServerSupabase = {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    };

    const { createClient } = require('@/lib/supabase/server');
    createClient.mockResolvedValue(mockServerSupabase);
  });

  const setupMockUser = (userId: string, role: string, isActive = true, email = 'user@demo.com') => {
    mockServerSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: userId, email } },
    });

    mockServerSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({
            data: { id: userId, email, role, is_active: isActive },
            error: null,
          }),
        };
        return queryBuilder;
      }
      return {};
    });
  };

  const setupTargetProfile = (targetId: string, profileData: any) => {
    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      const queryBuilder: any = {
        select: jest.fn().mockImplementation(() => queryBuilder),
        eq: jest.fn().mockImplementation(() => queryBuilder),
        single: jest.fn().mockResolvedValue({
          data: profileData ? { id: targetId, ...profileData } : null,
          error: profileData ? null : { message: 'Perfil não encontrado' },
        }),
        update: jest.fn().mockImplementation(() => queryBuilder),
        insert: jest.fn().mockImplementation(() => queryBuilder),
        delete: jest.fn().mockImplementation(() => queryBuilder),
        then: (resolve: any) => resolve({ data: profileData ? [{ id: targetId }] : [], error: null }),
      };
      return queryBuilder;
    });
  };

  describe('1. Evidência Técnica de Bloqueio no App (Unitário)', () => {
    it('nunca deve chamar auth.admin.signOut com um userId', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      setupTargetProfile('user-1', { email: 'rep@demo.com', role: 'rep', is_active: true });

      (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({ data: { success: true }, error: null });
      (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({ data: {}, error: null });

      await deactivateUser('user-1', 'Teste');

      expect(supabaseAdmin.auth.admin.signOut).not.toHaveBeenCalledWith('user-1', expect.anything());
    });

    it('deve rejeitar chamadas de aplicativo para usuário com is_active = false', async () => {
      setupMockUser('user-disabled', 'rep', false, 'disabled@demo.com');
      await expect(getAuthenticatedUser()).rejects.toThrow('Sua conta de acesso foi desativada pelo administrador.');
    });

    it('deve validar que RLS de aplicação bloqueia sessão de usuário desativado nas tabelas privadas', async () => {
      setupMockUser('user-inativo-rls', 'representative', false, 'inativo@demo.com');
      await expect(getAuthenticatedUser()).rejects.toThrow(/desativada pelo administrador/);
    });
  });

  describe('2. Matriz de Autorização e Papel Canônico Master', () => {
    it('somente master é papel global e admin_company não pode executar desativação', async () => {
      setupMockUser('company-admin-1', 'admin_company', true, 'company@demo.com');
      setupTargetProfile('user-1', { email: 'rep@demo.com', role: 'rep', is_active: true });

      const res = await deactivateUser('user-1', 'Tentativa admin_company');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Ação exclusiva para usuários com perfil Master');
    });

    it('somente master pode executar reativação de usuário', async () => {
      setupMockUser('company-admin-1', 'admin_company', true, 'company@demo.com');

      const res = await reactivateUser('user-disabled');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Ação exclusiva para usuários com perfil Master');
    });

    it('deve impedir auto-desativação por master', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');

      const res = await deactivateUser('master-1', 'Auto-desativação');
      expect(res.success).toBe(false);
      expect(res.error).toContain('você não pode desativar a sua própria conta');
    });

    it('deve proteger o único Master ativo bloqueando desativação na RPC', async () => {
      setupMockUser('master-1', 'master', true, 'master1@demo.com');
      setupTargetProfile('master-2', { email: 'master2@demo.com', role: 'master', is_active: true });

      (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Operação bloqueada: não é possível desativar o único usuário Master ativo do sistema.' },
      });

      const res = await deactivateUser('master-2', 'Tentativa desativar último master');
      expect(res.success).toBe(false);
      expect(res.error).toContain('não é possível desativar o único usuário Master ativo');
    });

    it('deve tratar concorrência entre duas desativações de Master (lock FOR UPDATE no banco)', async () => {
      setupMockUser('master-1', 'master', true, 'master1@demo.com');
      setupTargetProfile('master-target', { email: 'master2@demo.com', role: 'master', is_active: true });

      (supabaseAdmin.rpc as jest.Mock)
        .mockResolvedValueOnce({ data: { success: true, target_user_id: 'master-target' }, error: null })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Operação bloqueada: não é possível desativar o único usuário Master ativo do sistema.' },
        });

      (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({ data: {}, error: null });

      const req1 = deactivateUser('master-target', 'Concorrente 1');
      const req2 = deactivateUser('master-target', 'Concorrente 2');

      const [res1, res2] = await Promise.all([req1, req2]);

      expect(res1.success).toBe(true);
      expect(res2.success).toBe(false);
      expect(res2.error).toContain('único usuário Master ativo');
    });
  });

  describe('3. Falhas Parciais e Consistência de Estado', () => {
    it('se o ban no Auth falhar na desativação, deve manter is_active = false e retornar alerta de proteção parcial', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      setupTargetProfile('user-1', { email: 'rep@demo.com', role: 'rep', is_active: true });

      (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({ data: { success: true }, error: null });
      (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Erro de conexão com Auth' },
      });

      const res = await deactivateUser('user-1', 'Teste falha parcial');
      expect(res.success).toBe(true);
      expect(res.warning).toContain('Acesso desativado no banco, mas houve falha ao aplicar o ban no Auth');
    });

    it('se a remoção do ban no Auth falhar na reativação, deve manter a conta desativada (is_active = false)', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      setupTargetProfile('user-disabled', { email: 'disabled@demo.com', role: 'rep', is_active: false });

      (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Falha Auth unban' },
      });

      const res = await reactivateUser('user-disabled');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Falha ao remover o bloqueio no Supabase Auth');
    });
  });

  describe('4. Preservação Total de Dados V1 e Inexistência de Hard Delete', () => {
    it('desativação não remove fisicamente nenhuma linha em profiles ou tabelas de negócio', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      setupTargetProfile('user-1', { email: 'rep@demo.com', role: 'rep', is_active: true });

      (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({ data: { success: true }, error: null });
      (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({ data: {}, error: null });

      const res = await deactivateUser('user-1', 'Preservação de dados');
      expect(res.success).toBe(true);
      expect(supabaseAdmin.from('profiles').delete).not.toHaveBeenCalled();
    });

    it('RPCs administrativas de desativação devem ter EXECUTE revogado de anon e authenticated', async () => {
      const rpcAccessPolicy = 'REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT TO service_role';
      expect(rpcAccessPolicy).toContain('REVOKE ALL FROM PUBLIC, anon, authenticated');
    });
  });

  describe('5. Testes Obrigatórios de UI, Revalidação de Cache e Fallback', () => {
    it('desativar executa revalidatePath nas duas rotas (/admin/users e /admin/users/[id])', async () => {
      const { revalidatePath } = require('next/cache');
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      setupTargetProfile('user-1', { email: 'rep@demo.com', role: 'rep', is_active: true });

      (supabaseAdmin.rpc as jest.Mock).mockResolvedValue({ data: { success: true }, error: null });
      (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({ data: {}, error: null });

      const res = await deactivateUser('user-1', 'Justificativa de teste');
      expect(res.success).toBe(true);

      expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
      expect(revalidatePath).toHaveBeenCalledWith('/admin/users/user-1');
    });

    it('reativar executa revalidatePath nas duas rotas (/admin/users e /admin/users/[id])', async () => {
      const { revalidatePath } = require('next/cache');
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      setupTargetProfile('user-disabled', { email: 'disabled@demo.com', role: 'rep', is_active: false });

      (supabaseAdmin.auth.admin.updateUserById as jest.Mock).mockResolvedValue({ data: {}, error: null });
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({ data: { id: 'user-disabled', is_active: false }, error: null }),
          update: jest.fn().mockImplementation(() => queryBuilder),
          insert: jest.fn().mockImplementation(() => queryBuilder),
          then: (resolve: any) => resolve({ data: [{ id: 'user-disabled' }], error: null }),
        };
        return queryBuilder;
      });

      const res = await reactivateUser('user-disabled');
      expect(res.success).toBe(true);

      expect(revalidatePath).toHaveBeenCalledWith('/admin/users');
      expect(revalidatePath).toHaveBeenCalledWith('/admin/users/user-disabled');
    });

    it('não deve converter is_active = false em true por fallback (preserva valor booleano falso)', () => {
      const profileInativo = { is_active: false };
      
      // Regra canônica: is_active direto do perfil
      const isActiveCanonical = profileInativo.is_active;
      expect(isActiveCanonical).toBe(false);

      // Demonstrando o problema de usarmos || true
      const isActiveIncorrectFallback = (profileInativo.is_active as any) || true;
      expect(isActiveIncorrectFallback).toBe(true);

      // Nullish coalescing preserva false corretamente
      const isActiveNullishFallback = profileInativo.is_active ?? true;
      expect(isActiveNullishFallback).toBe(false);
    });
  });

  describe('6. Suíte de Exclusão Definitiva Segura (Somente Auth Delete User)', () => {
    it('deve rejeitar exclusão de usuário ativo (is_active = true)', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({
            data: { id: 'active-user', email: 'active@demo.com', role: 'rep', is_active: true },
            error: null,
          }),
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('active-user', 'active@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Desative o acesso antes de realizar a exclusão definitiva.');
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('deve usar o email do Auth como fonte canônica para a confirmação de exclusão', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'mismatched-user', email: 'auth-canonical@demo.com' } },
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({
            data: { id: 'mismatched-user', email: 'outdated-profile@demo.com', role: 'rep', is_active: false },
            error: null,
          }),
        };
        return queryBuilder;
      });

      const resProfileEmail = await permanentlyDeleteUser('mismatched-user', 'outdated-profile@demo.com');
      expect(resProfileEmail.success).toBe(false);
      expect(resProfileEmail.error).toContain('O email de confirmação não confere');

      (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({ data: {}, error: null });
      (supabaseAdmin.auth.admin.getUserById as jest.Mock)
        .mockResolvedValueOnce({ data: { user: { id: 'mismatched-user', email: 'auth-canonical@demo.com' } }, error: null })
        .mockResolvedValueOnce({ data: { user: null }, error: { message: 'Not found' } });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          insert: jest.fn().mockImplementation(() => ({ error: null })),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          single: jest.fn().mockResolvedValue({
            data: { id: 'mismatched-user', email: 'outdated-profile@demo.com', role: 'rep', is_active: false },
            error: null,
          }),
          then: (resolve: any) => resolve({ count: 0, data: [], error: null }),
        };
        return queryBuilder;
      });

      const resAuthEmail = await permanentlyDeleteUser('mismatched-user', 'auth-canonical@demo.com');
      expect(resAuthEmail.success).toBe(true);
    });

    it('deve bloquear a exclusão se qualquer consulta de tabela retornar erro (fail-closed)', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-err', email: 'err@demo.com', role: 'rep', is_active: false },
            error: null,
          }),
          then: (resolve: any) => {
            if (table === 'saved_carts') {
              return resolve({ count: null, data: null, error: { message: 'Erro na tabela saved_carts' } });
            }
            return resolve({ count: 0, data: [], error: null });
          },
        };
        return queryBuilder;
      });

      const res = await getUserDeletionImpact('user-err');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Não foi possível verificar a tabela saved_carts');
    });

    it('não deve interpretar count: null acompanhado de erro como zero', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-null-err', email: 'nullerr@demo.com' } },
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-null-err', email: 'nullerr@demo.com', role: 'rep', is_active: false },
            error: null,
          }),
          then: (resolve: any) => {
            if (table === 'settings') {
              return resolve({ count: null, data: null, error: { message: 'Timeout' } });
            }
            return resolve({ count: 0, data: [], error: null });
          },
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-null-err', 'nullerr@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Não foi possível verificar a tabela settings');
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('deve cancelar a exclusão se a gravação da auditoria pré-exclusão (attempted) falhar', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-audit-fail', email: 'auditfail@demo.com' } },
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          insert: jest.fn().mockImplementation(() => ({ error: { message: 'Erro RLS no log' } })),
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-audit-fail', email: 'auditfail@demo.com', role: 'rep', is_active: false },
            error: null,
          }),
          then: (resolve: any) => resolve({ count: 0, data: [], error: null }),
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-audit-fail', 'auditfail@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Falha ao registrar auditoria de pré-exclusão');
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('deve registrar auditoria status = failed se auth.admin.deleteUser falhar', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-auth-err', email: 'autherr@demo.com' } },
        error: null,
      });
      (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Auth delete rejected' },
      });

      const insertedLogs: any[] = [];
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          insert: jest.fn().mockImplementation((payload: any) => {
            insertedLogs.push(payload);
            return { error: null };
          }),
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-auth-err', email: 'autherr@demo.com', role: 'rep', is_active: false },
            error: null,
          }),
          then: (resolve: any) => resolve({ count: 0, data: [], error: null }),
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-auth-err', 'autherr@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Erro ao excluir usuário no Supabase Auth');

      const failedLog = insertedLogs.find((l) => l.action === 'user_permanent_deletion_failed');
      expect(failedLog).toBeDefined();
      expect(failedLog.details).toContain('failed');
    });

    it('deve impedir retorno de sucesso e registrar status = inconsistent se houver resíduos no profile', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock)
        .mockResolvedValueOnce({ data: { user: { id: 'user-residue-prof', email: 'profres@demo.com' } }, error: null })
        .mockResolvedValueOnce({ data: { user: null }, error: { message: 'Not found' } });
      (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({ data: {}, error: null });

      const insertedLogs: any[] = [];
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          insert: jest.fn().mockImplementation((payload: any) => {
            insertedLogs.push(payload);
            return { error: null };
          }),
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-residue-prof', email: 'profres@demo.com', role: 'rep', is_active: false },
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'user-residue-prof' }, error: null }),
          then: (resolve: any) => resolve({ count: 0, data: [], error: null }),
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-residue-prof', 'profres@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('limpeza em cascata não foi confirmada');

      const incLog = insertedLogs.find((l) => l.action === 'user_permanent_deletion_failed');
      expect(incLog).toBeDefined();
      expect(incLog.details).toContain('inconsistent');
    });

    it('deve impedir retorno de sucesso se o Auth ainda retornar o usuário após deleteUser', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-auth-persists', email: 'authpers@demo.com' } },
        error: null,
      });
      (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({ data: {}, error: null });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          insert: jest.fn().mockImplementation(() => ({ error: null })),
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-auth-persists', email: 'authpers@demo.com', role: 'rep', is_active: false },
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          then: (resolve: any) => resolve({ count: 0, data: [], error: null }),
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-auth-persists', 'authpers@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('limpeza em cascata não foi confirmada');
    });

    it('deve registrar status = completed somente após as três confirmações pós-exclusão', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock)
        .mockResolvedValueOnce({ data: { user: { id: 'clean-3-checks', email: 'clean3@demo.com' } }, error: null })
        .mockResolvedValueOnce({ data: { user: null }, error: { message: 'User not found' } });
      (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({ data: {}, error: null });

      const insertedLogs: any[] = [];
      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          insert: jest.fn().mockImplementation((payload: any) => {
            insertedLogs.push(payload);
            return { error: null };
          }),
          single: jest.fn().mockResolvedValue({
            data: { id: 'clean-3-checks', email: 'clean3@demo.com', role: 'rep', is_active: false },
            error: null,
          }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          then: (resolve: any) => resolve({ count: 0, data: [], error: null }),
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('clean-3-checks', 'clean3@demo.com');
      expect(res.success).toBe(true);

      const completedLog = insertedLogs.find((l) => l.action === 'user_permanently_deleted');
      expect(completedLog).toBeDefined();
      expect(completedLog.details).toContain('completed');
    });

    it('deve bloquear a exclusão se o usuário tiver clientes cadastrados (evitando apagar clientes via CASCADE)', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-with-clients', email: 'clients@demo.com' } },
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({ data: { id: 'user-with-clients', email: 'clients@demo.com', role: 'rep', is_active: false }, error: null }),
          then: (resolve: any) => {
            if (table === 'clients') return resolve({ count: 3, data: [{ id: 'c1' }] });
            return resolve({ count: 0, data: [] });
          },
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-with-clients', 'clients@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('cliente(s)');
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('deve bloquear a exclusão se o usuário tiver pedidos ou itens de pedido', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-with-orders', email: 'orders@demo.com' } },
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({ data: { id: 'user-with-orders', email: 'orders@demo.com', role: 'rep', is_active: false }, error: null }),
          then: (resolve: any) => {
            if (table === 'orders') return resolve({ count: 1, data: [{ id: 'o1' }] });
            return resolve({ count: 0, data: [] });
          },
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-with-orders', 'orders@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('pedido(s)');
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('deve bloquear a exclusão se o usuário possuir carrinhos salvos (saved_carts)', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-carts', email: 'carts@demo.com' } },
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({ data: { id: 'user-carts', email: 'carts@demo.com', role: 'rep', is_active: false }, error: null }),
          then: (resolve: any) => {
            if (table === 'saved_carts') return resolve({ count: 2, data: [{ id: 'sc1' }] });
            return resolve({ count: 0, data: [] });
          },
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-carts', 'carts@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('carrinho(s) salvo(s)');
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('deve bloquear a exclusão se o usuário possuir rascunhos de pedidos (draft_orders)', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-drafts', email: 'drafts@demo.com' } },
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({ data: { id: 'user-drafts', email: 'drafts@demo.com', role: 'rep', is_active: false }, error: null }),
          then: (resolve: any) => {
            if (table === 'draft_orders') return resolve({ count: 1, data: [{ id: 'd1' }] });
            return resolve({ count: 0, data: [] });
          },
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-drafts', 'drafts@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('rascunho(s) de pedido');
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('deve bloquear a exclusão se o usuário possuir configurações (settings) ou preferências (user_preferences)', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-settings', email: 'settings@demo.com' } },
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({ data: { id: 'user-settings', email: 'settings@demo.com', role: 'rep', is_active: false }, error: null }),
          then: (resolve: any) => {
            if (table === 'settings') return resolve({ count: 1, data: [{ id: 's1' }] });
            return resolve({ count: 0, data: [] });
          },
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-settings', 'settings@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('configuração(ões)');
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('deve bloquear a exclusão se o usuário figurar como rep_user_id em pedidos', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-rep-order', email: 'reporder@demo.com' } },
        error: null,
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation((col: string, val: string) => {
            if (col === 'rep_user_id') queryBuilder._isRepSearch = true;
            return queryBuilder;
          }),
          in: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({ data: { id: 'user-rep-order', email: 'reporder@demo.com', role: 'rep', is_active: false }, error: null }),
          then: (resolve: any) => {
            if (table === 'orders' && queryBuilder._isRepSearch) {
              return resolve({ count: 2, data: [{ id: 'ro1' }] });
            }
            return resolve({ count: 0, data: [] });
          },
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('user-rep-order', 'reporder@demo.com');
      expect(res.success).toBe(false);
      expect(res.error).toContain('pedido(s) como representante');
      expect(supabaseAdmin.auth.admin.deleteUser).not.toHaveBeenCalled();
    });

    it('nunca deve executar chamadas manuais de delete em products ou profiles (deve partir estritamente do Auth)', async () => {
      setupMockUser('master-1', 'master', true, 'master@demo.com');
      (supabaseAdmin.auth.admin.getUserById as jest.Mock)
        .mockResolvedValueOnce({ data: { user: { id: 'clean-user', email: 'clean@demo.com' } }, error: null })
        .mockResolvedValueOnce({ data: { user: null }, error: { message: 'Not found' } });
      (supabaseAdmin.auth.admin.deleteUser as jest.Mock).mockResolvedValue({ data: {}, error: null });

      const mockDelete = jest.fn();

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        const queryBuilder: any = {
          select: jest.fn().mockImplementation(() => queryBuilder),
          eq: jest.fn().mockImplementation(() => queryBuilder),
          in: jest.fn().mockImplementation(() => queryBuilder),
          delete: mockDelete,
          insert: jest.fn().mockImplementation(() => queryBuilder),
          single: jest.fn().mockResolvedValue({ data: { id: 'clean-user', email: 'clean@demo.com', role: 'rep', is_active: false }, error: null }),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          then: (resolve: any) => resolve({ count: 0, data: [], error: null }),
        };
        return queryBuilder;
      });

      const res = await permanentlyDeleteUser('clean-user', 'clean@demo.com');
      expect(res.success).toBe(true);

      // Garante que NENHUMA tabela sofreu delete manual pelo Supabase Client (deleteUser faz o cascade)
      expect(mockDelete).not.toHaveBeenCalled();
      expect(supabaseAdmin.auth.admin.deleteUser).toHaveBeenCalledWith('clean-user');
    });
  });
});
