import {
  getAdminLeadsAction,
  updateLeadStatusAction,
  toggleLeadHandledAction,
  deleteLeadAction,
  LeadItem,
} from '@/app/admin/leads/actions';

// Polyfill environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';

let mockCurrentUser = {
  id: 'usr-admin-999',
  email: 'admin@repvendas.com.br',
};

let mockCurrentProfile = {
  id: mockCurrentUser.id,
  role: 'master',
};

let mockLeadsDb: LeadItem[] = [
  {
    id: 'lead-1',
    name: 'Carlos Oliveira',
    email: 'carlos@otica.com',
    whatsapp: '11988887777',
    company_name: 'Ótica Visão',
    acting_type: 'representante',
    source: 'landing_page',
    status: 'lead_captured',
    handled: false,
    user_id: null,
    submission_id: 'sub-1',
    utm_source: 'google',
    utm_medium: 'cpc',
    utm_campaign: 'promo',
    utm_content: null,
    utm_term: null,
    metadata: null,
    created_at: new Date(Date.now() - 10000).toISOString(),
    updated_at: new Date(Date.now() - 10000).toISOString(),
  },
  {
    id: 'lead-2',
    name: 'Ana Souza',
    email: 'ana@distribuidora.com',
    whatsapp: '11977776666',
    company_name: 'Distribuidora Lentes',
    acting_type: 'distribuidora',
    source: 'landing_page',
    status: 'in_contact',
    handled: true,
    user_id: 'usr-ana-111',
    submission_id: 'sub-2',
    utm_source: 'instagram',
    utm_medium: 'social',
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    metadata: null,
    created_at: new Date(Date.now() - 50000).toISOString(),
    updated_at: new Date(Date.now() - 50000).toISOString(),
  },
];

const createMockSupabase = () => {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockCurrentUser }, error: null }),
    },
    from: jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: mockCurrentProfile, error: null }),
            }),
          }),
        };
      }

      if (table === 'leads') {
        return {
          select: jest.fn().mockImplementation((_cols: string, opts?: any) => {
            const isHeadCount = opts?.head === true;
            let current = [...mockLeadsDb];

            const chain: any = {
              eq: jest.fn((field: string, val: any) => {
                current = current.filter((l) => (l as any)[field] === val);
                return chain;
              }),
              or: jest.fn((_condStr: string) => chain),
              gte: jest.fn(() => chain),
              lte: jest.fn(() => chain),
              order: jest.fn(() => chain),
              range: jest.fn((start: number, end: number) => {
                const sliced = current.slice(start, end + 1);
                return Promise.resolve({ data: sliced, count: current.length, error: null });
              }),
              maybeSingle: jest.fn(() => {
                const singleLead = current.length > 0 ? current[0] : null;
                return Promise.resolve({ data: singleLead, error: null });
              }),
            };

            if (isHeadCount) {
              return {
                ...chain,
                eq: jest.fn((field: string, val: any) => {
                  const filtered = current.filter((l) => (l as any)[field] === val);
                  return Promise.resolve({ count: filtered.length, error: null });
                }),
                then: (cb: any) => cb({ count: current.length, error: null }),
              };
            }

            return chain;
          }),

          update: jest.fn().mockImplementation((payload: any) => ({
            eq: jest.fn().mockImplementation(async (field: string, val: string) => {
              mockLeadsDb = mockLeadsDb.map((l) =>
                (l as any)[field] === val ? { ...l, ...payload } : l
              );
              return { data: payload, error: null };
            }),
          })),

          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation(async (field: string, val: string) => {
              mockLeadsDb = mockLeadsDb.filter((l) => (l as any)[field] !== val);
              return { data: null, error: null };
            }),
          }),
        };
      }

      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };
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

describe('Gestão de Leads na Torre de Controle (/admin/leads) — Auditoria de Segurança', () => {
  beforeEach(() => {
    mockCurrentUser = {
      id: 'usr-admin-999',
      email: 'admin@repvendas.com.br',
    };
    mockCurrentProfile = {
      id: mockCurrentUser.id,
      role: 'master',
    };

    mockLeadsDb = [
      {
        id: 'lead-1',
        name: 'Carlos Oliveira',
        email: 'carlos@otica.com',
        whatsapp: '11988887777',
        company_name: 'Ótica Visão',
        acting_type: 'representante',
        source: 'landing_page',
        status: 'lead_captured',
        handled: false,
        user_id: null,
        submission_id: 'sub-1',
        utm_source: 'google',
        utm_medium: 'cpc',
        utm_campaign: 'promo',
        utm_content: null,
        utm_term: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'lead-2',
        name: 'Ana Souza',
        email: 'ana@distribuidora.com',
        whatsapp: '11977776666',
        company_name: 'Distribuidora Lentes',
        acting_type: 'distribuidora',
        source: 'landing_page',
        status: 'in_contact',
        handled: true,
        user_id: 'usr-ana-111',
        submission_id: 'sub-2',
        utm_source: 'instagram',
        utm_medium: 'social',
        utm_campaign: null,
        utm_content: null,
        utm_term: null,
        metadata: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  });

  it('1. getAdminLeadsAction: Retorna lista paginada e calcula métricas globais para Master/Admin', async () => {
    const res = await getAdminLeadsAction({ page: 1, pageSize: 20 });

    expect(res.success).toBe(true);
    expect(res.leads.length).toBe(2);
    expect(res.metrics.total).toBe(2);
    expect(res.metrics.newLeads).toBe(1);
    expect(res.metrics.inContact).toBe(1);
    expect(res.metrics.handledCount).toBe(1);
  });

  it('2. updateLeadStatusAction: Sucesso ao alterar para status comercial (in_contact, converted, discarded)', async () => {
    const res = await updateLeadStatusAction('lead-1', 'converted');

    expect(res.success).toBe(true);
    const updated = mockLeadsDb.find((l) => l.id === 'lead-1');
    expect(updated?.status).toBe('converted');
  });

  it('3. updateLeadStatusAction: BLOQUEIO ESTRITO DE BACKEND para atribuição manual de status do funil do sistema', async () => {
    const res = await updateLeadStatusAction('lead-1', 'activated');

    expect(res.success).toBe(false);
    expect(res.error).toContain('controlado automaticamente pelo sistema');
    const lead = mockLeadsDb.find((l) => l.id === 'lead-1');
    expect(lead?.status).toBe('lead_captured');
  });

  it('4. toggleLeadHandledAction: Alterna a flag handled (tratamento humano)', async () => {
    const res1 = await toggleLeadHandledAction('lead-1', true);
    expect(res1.success).toBe(true);
    expect(mockLeadsDb.find((l) => l.id === 'lead-1')?.handled).toBe(true);
  });

  it('5. deleteLeadAction: Exclusão física para lead previamente marcado como descartado', async () => {
    // Primeiro marcar lead como descartado
    mockLeadsDb[0].status = 'discarded';
    const res = await deleteLeadAction('lead-1');
    expect(res.success).toBe(true);
    expect(mockLeadsDb.length).toBe(1);
  });

  it('6. Segurança: Bloqueia acesso/listagem para usuário não autorizado (company_admin ou representative)', async () => {
    mockCurrentProfile.role = 'company_admin';

    const res = await getAdminLeadsAction({ page: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toContain('Apenas administradores globais da Torre de Controle');
  });

  it('7. Segurança: Bloqueia alteração de status para usuário não autorizado (representative)', async () => {
    mockCurrentProfile.role = 'representative';

    const res = await updateLeadStatusAction('lead-1', 'in_contact');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Apenas administradores globais da Torre de Controle');
  });

  it('8. Segurança: Bloqueia exclusão física para usuário não autorizado (company_admin)', async () => {
    mockCurrentProfile.role = 'company_admin';

    const res = await deleteLeadAction('lead-1');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Apenas administradores globais da Torre de Controle');
  });

  it('9. Segurança Backend: Bloqueia exclusão física de lead em fluxo ativo MESMO para perfil Master', async () => {
    // Definir perfil como 'master'
    mockCurrentProfile.role = 'master';
    // lead-1 está com status 'lead_captured' (fluxo ativo normal)
    const res = await deleteLeadAction('lead-1');

    expect(res.success).toBe(false);
    expect(res.error).toContain("Marque o lead como 'Descartado' antes de excluir");
    // O lead ativo continua intacto no banco
    expect(mockLeadsDb.find((l) => l.id === 'lead-1')).toBeDefined();
  });
});
