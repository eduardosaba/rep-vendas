import { saveOnboardingStep1, saveOnboardingStep2, saveOnboardingStep3, finishOnboarding } from '@/app/onboarding/actions';

// Polyfills and mocks for Supabase and environment
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

const mockUser = {
  id: 'usr-test-123',
  email: 'teste.onboarding@repvendas.com.br',
};

const mockProfile = {
  id: mockUser.id,
  full_name: 'Novo Usuário Teste',
  phone: '11999998888',
  email: mockUser.email,
  organization_id: null as string | null,
  onboarding_completed: false,
  onboarding_step: 1,
};

let mockOrgStore: Array<{ id: string; name: string; slug: string; owner_user_id: string }> = [];
let mockMemberStore: Array<{ organization_id: string; user_id: string; role: string }> = [];
let mockSettingsStore: Array<{ user_id: string; catalog_slug: string; name: string }> = [];
let mockPublicCatalogStore: Array<{ user_id: string; catalog_slug: string; store_name: string }> = [];
let mockLeadStore: Array<{ user_id: string; email: string; status: string }> = [
  { user_id: mockUser.id, email: mockUser.email, status: 'new' },
];

const createMockSupabase = () => {
  const client: any = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockImplementation(async () => ({ data: mockProfile, error: null })),
              maybeSingle: jest.fn().mockImplementation(async () => ({ data: mockProfile, error: null })),
            }),
          }),
          update: jest.fn().mockImplementation((payload: any) => {
            Object.assign(mockProfile, payload);
            return {
              eq: jest.fn().mockImplementation(async () => ({ data: mockProfile, error: null })),
            };
          }),
        };
      }

      if (table === 'organizations') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn((field: string, val: string) => ({
              maybeSingle: jest.fn().mockImplementation(async () => {
                const found = mockOrgStore.find((o) => (o as any)[field] === val);
                return { data: found || null, error: null };
              }),
            })),
          }),
          insert: jest.fn().mockImplementation((payload: any) => {
            const inserted = { id: `org-${mockOrgStore.length + 1}`, ...payload };
            mockOrgStore.push(inserted);
            return {
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: inserted, error: null }),
              }),
            };
          }),
          update: jest.fn().mockImplementation((payload: any) => ({
            eq: jest.fn().mockImplementation(async () => ({ data: payload, error: null })),
          })),
        };
      }

      if (table === 'companies') {
        return {
          upsert: jest.fn().mockImplementation((payload: any) => {
            return Promise.resolve({ data: payload, error: null });
          }),
        };
      }

      if (table === 'organization_members') {
        return {
          upsert: jest.fn().mockImplementation((payload: any) => {
            const exists = mockMemberStore.find(
              (m) => m.organization_id === payload.organization_id && m.user_id === payload.user_id
            );
            if (!exists) {
              mockMemberStore.push(payload);
            }
            return Promise.resolve({ data: payload, error: null });
          }),
        };
      }

      if (table === 'settings') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn((field: string, val: string) => ({
              maybeSingle: jest.fn().mockImplementation(async () => {
                const found = mockSettingsStore.find((s) => (s as any)[field] === val);
                return { data: found || null, error: null };
              }),
            })),
          }),
          upsert: jest.fn().mockImplementation((payload: any) => {
            const index = mockSettingsStore.findIndex((s) => s.user_id === payload.user_id);
            if (index >= 0) {
              mockSettingsStore[index] = payload;
            } else {
              mockSettingsStore.push(payload);
            }
            return Promise.resolve({ data: payload, error: null });
          }),
        };
      }

      if (table === 'public_catalogs') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn((field: string, val: string) => ({
              maybeSingle: jest.fn().mockImplementation(async () => {
                const found = mockPublicCatalogStore.find((pc) => (pc as any)[field] === val);
                return { data: found || null, error: null };
              }),
            })),
          }),
          update: jest.fn().mockImplementation((payload: any) => ({
            eq: jest.fn().mockImplementation(async () => ({ data: payload, error: null })),
          })),
          insert: jest.fn().mockImplementation((payload: any) => {
            mockPublicCatalogStore.push(payload);
            return Promise.resolve({ data: payload, error: null });
          }),
        };
      }

      if (table === 'leads') {
        return {
          update: jest.fn().mockImplementation((payload: any) => ({
            eq: jest.fn().mockImplementation(async (field: string, val: string) => {
              mockLeadStore.forEach((l) => {
                if (l.user_id === val) {
                  l.status = payload.status;
                }
              });
              return { data: null, error: null };
            }),
          })),
        };
      }

      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
  return client;
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(createMockSupabase())),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => createMockSupabase()),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Homologação da Fase 2 — Onboarding & Idempotência', () => {
  beforeEach(() => {
    mockOrgStore = [];
    mockMemberStore = [];
    mockSettingsStore = [];
    mockPublicCatalogStore = [];
    mockLeadStore = [{ user_id: mockUser.id, email: mockUser.email, status: 'new' }];
    mockProfile.organization_id = null;
    mockProfile.onboarding_completed = false;
    mockProfile.onboarding_step = 1;
  });

  it('1. Etapa 1: Salva dados pessoais e avança onboarding_step para 2', async () => {
    const res = await saveOnboardingStep1({
      fullName: 'Novo Usuário Teste',
      phone: '11999998888',
      email: mockUser.email,
    });

    expect(res.success).toBe(true);
    expect(res.nextStep).toBe(2);
    expect(mockProfile.onboarding_step).toBe(2);
  });

  it('2. Etapa 2: Cria Organização e Membership e é 100% IDEMPOTENTE em múltiplos cliques', async () => {
    // Primeira chamada da Etapa 2
    const res1 = await saveOnboardingStep2({
      companyName: 'Ótica Visão Premium',
      organizationType: 'optical_store',
    });

    expect(res1.success).toBe(true);
    expect(res1.nextStep).toBe(3);
    expect(mockOrgStore.length).toBe(1);
    expect(mockMemberStore.length).toBe(1);
    expect(mockProfile.organization_id).toBe(res1.organizationId);

    // Segunda chamada da Etapa 2 (Simulação de clique duplo / reenvio da Action)
    const res2 = await saveOnboardingStep2({
      companyName: 'Ótica Visão Premium',
      organizationType: 'optical_store',
    });

    expect(res2.success).toBe(true);
    expect(res2.organizationId).toBe(res1.organizationId);
    expect(mockOrgStore.length).toBe(1); // NENHUMA organização duplicada criada
    expect(mockMemberStore.length).toBe(1); // NENHUM membership duplicado criado
    expect(mockProfile.organization_id).toBe(res1.organizationId);
  });

  it('3. Etapa 3: Configura Settings, gera Slug único e provisiona Public Catalog', async () => {
    const res = await saveOnboardingStep3({
      storeName: 'Ótica Visão Loja',
      slug: 'visao-loja',
      primaryColor: '#2563eb',
    });

    expect(res.success).toBe(true);
    expect(res.nextStep).toBe(4);
    expect(mockProfile.onboarding_step).toBe(4);
    expect(mockSettingsStore.length).toBe(1);
    expect(mockSettingsStore[0].catalog_slug).toBe('visao-loja');
  });

  it('4. Etapa 4: Finaliza Onboarding e atualiza status do Lead para activated', async () => {
    const res = await finishOnboarding();

    expect(res.success).toBe(true);
    expect(res.redirectTo).toBe('/dashboard');
    expect(mockProfile.onboarding_completed).toBe(true);
    expect(mockProfile.onboarding_step).toBe(4);
    expect((mockProfile as any).onboarding_completed_at).toBeDefined();

    // Confirmar que o lead associado mudou para activated
    expect(mockLeadStore[0].status).toBe('activated');
  });
});
