import { isGlobalAdmin } from './roles';

export type SubscriptionAccessStatus =
  | 'ACTIVE_MASTER'
  | 'ACTIVE_TEAM'
  | 'ACTIVE_PAID'
  | 'GRACE_PERIOD_PAID'
  | 'EXPIRED_PAID'
  | 'ACTIVE_TRIAL'
  | 'GRACE_PERIOD_TRIAL'
  | 'BLOCKED_TRIAL'
  | 'BLOCKED_ADMIN'
  | 'UNKNOWN';

export interface ProfileAccessInput {
  id: string;
  role?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  company_id?: string | null;
  trial_ends_at?: string | null;
  created_at?: string | null;
}

export interface SubscriptionAccessInput {
  status?: string | null;
  price?: number | null;
  plan_name?: string | null;
  current_period_end?: string | null;
}

export interface AccessResolutionResult {
  status: SubscriptionAccessStatus;
  isAllowed: boolean;
  isBlocked: boolean;
  inGracePeriod: boolean;
  daysRemainingOrOverdue: number;
  reason: string;
  expiryDate: string | null;
}

/**
 * REGRA CANÔNICA DE ACESSO DO REPVENDAS
 * Centraliza a validação de acesso ao sistema em layouts, middleware, server actions e APIs.
 *
 * Diretrizes críticas:
 * 1. NUNCA bloqueia administradores globais (master/admin).
 * 2. NUNCA bloqueia membros de equipe vinculados à distribuidora (cobertos por licença corporativa).
 * 3. NUNCA bloqueia clientes pagantes ativos (profiles.status === 'active'), mesmo com datas legadas.
 * 4. Aplica período de tolerância (grace period) de 5 dias após o término do teste gratuito.
 * 5. Bloqueia estritamente acessos de testes que ultrapassaram os 5 dias de carência.
 */
export function resolveSubscriptionAccess(
  profile: ProfileAccessInput | null | undefined,
  subscription?: SubscriptionAccessInput | null | undefined,
  referenceDate: Date = new Date()
): AccessResolutionResult {
  if (!profile) {
    return {
      status: 'UNKNOWN',
      isAllowed: false,
      isBlocked: true,
      inGracePeriod: false,
      daysRemainingOrOverdue: 0,
      reason: 'Perfil de usuário não encontrado.',
      expiryDate: null,
    };
  }

  // 1. Bloqueio Administrativo explícito
  if (profile.is_active === false || profile.status === 'inactive' || profile.status === 'blocked') {
    return {
      status: 'BLOCKED_ADMIN',
      isAllowed: false,
      isBlocked: true,
      inGracePeriod: false,
      daysRemainingOrOverdue: 0,
      reason: 'Conta desativada ou suspensa administrativamente.',
      expiryDate: null,
    };
  }

  // 1.1 Assinatura Cancelada
  if (subscription?.status === 'canceled') {
    return {
      status: 'BLOCKED_ADMIN',
      isAllowed: false,
      isBlocked: true,
      inGracePeriod: false,
      daysRemainingOrOverdue: 0,
      reason: 'Assinatura cancelada.',
      expiryDate: subscription?.current_period_end || null,
    };
  }

  // 1.2 Assinatura Inadimplente (past_due) ou Perfil Inadimplente
  if (
    subscription?.status === 'past_due' ||
    profile.status === 'past_due' ||
    profile.status === 'inadimplente'
  ) {
    return {
      status: 'EXPIRED_PAID',
      isAllowed: false,
      isBlocked: true,
      inGracePeriod: false,
      daysRemainingOrOverdue: 0,
      reason: 'Assinatura com pagamento pendente / inadimplente.',
      expiryDate: subscription?.current_period_end || null,
    };
  }

  const roleLower = String(profile.role || '').toLowerCase().trim();

  // 2. Administradores Globais (Torre de Controle)
  if (isGlobalAdmin(roleLower) || roleLower === 'master' || roleLower === 'admin') {
    return {
      status: 'ACTIVE_MASTER',
      isAllowed: true,
      isBlocked: false,
      inGracePeriod: false,
      daysRemainingOrOverdue: 999,
      reason: 'Administrador global da plataforma.',
      expiryDate: null,
    };
  }

  // 3. Membros de equipe da Distribuidora (cobertos pela licença da empresa)
  const isCompanyMember = Boolean(profile.company_id);
  const isTeamRep =
    roleLower === 'representative' ||
    roleLower === 'rep' ||
    roleLower === 'representante';

  if (isCompanyMember && isTeamRep) {
    return {
      status: 'ACTIVE_TEAM',
      isAllowed: true,
      isBlocked: false,
      inGracePeriod: false,
      daysRemainingOrOverdue: 999,
      reason: 'Representante vinculado a empresa distribuidora (coberto por licença corporativa).',
      expiryDate: null,
    };
  }

  // 4. Verificação de Vencimento de Assinatura Paga (current_period_end)
  if (subscription?.current_period_end) {
    const expDate = new Date(subscription.current_period_end);
    const diffTime = referenceDate.getTime() - expDate.getTime();

    // Se a data já expirou
    if (diffTime > 0) {
      const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (daysOverdue > 5) {
        return {
          status: 'EXPIRED_PAID',
          isAllowed: false,
          isBlocked: true,
          inGracePeriod: false,
          daysRemainingOrOverdue: -daysOverdue,
          reason: `Assinatura paga expirada há ${daysOverdue} dias (tolerância de 5 dias encerrada).`,
          expiryDate: subscription.current_period_end,
        };
      } else {
        return {
          status: 'GRACE_PERIOD_PAID',
          isAllowed: true,
          isBlocked: false,
          inGracePeriod: true,
          daysRemainingOrOverdue: -daysOverdue,
          reason: `Assinatura paga expirada há ${daysOverdue} dia(s), operando em período de tolerância (máx 5 dias).`,
          expiryDate: subscription.current_period_end,
        };
      }
    }

    // Assinatura paga dentro da validade
    const daysRemaining = Math.max(0, Math.ceil(-diffTime / (1000 * 60 * 60 * 24)));
    return {
      status: 'ACTIVE_PAID',
      isAllowed: true,
      isBlocked: false,
      inGracePeriod: false,
      daysRemainingOrOverdue: daysRemaining,
      reason: `Assinante ativo no sistema (${daysRemaining} dias restantes).`,
      expiryDate: subscription.current_period_end,
    };
  }

  // 5. Usuários em Teste Gratuito (Trial) ou Novos Cadastros
  // Prioridade de data de término:
  // 1. profiles.trial_ends_at
  // 2. profiles.created_at + 14 dias
  let trialEndIso: string | null = profile.trial_ends_at || null;

  if (!trialEndIso && profile.created_at) {
    const createdDate = new Date(profile.created_at);
    const fallbackEnd = new Date(createdDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    trialEndIso = fallbackEnd.toISOString();
  }

  if (trialEndIso) {
    const trialEndDate = new Date(trialEndIso);
    const diffTime = referenceDate.getTime() - trialEndDate.getTime();
    const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Expirou há mais de 5 dias -> Bloqueio Total (Fora da carência)
    if (daysOverdue > 5) {
      return {
        status: 'BLOCKED_TRIAL',
        isAllowed: false,
        isBlocked: true,
        inGracePeriod: false,
        daysRemainingOrOverdue: -daysOverdue,
        reason: `Período de teste gratuito expirado há ${daysOverdue} dias (tolerância de 5 dias encerrada).`,
        expiryDate: trialEndIso,
      };
    }

    // Expirou, mas está dentro dos 5 dias de carência (Tolerância)
    if (daysOverdue > 0) {
      return {
        status: 'GRACE_PERIOD_TRIAL',
        isAllowed: true,
        isBlocked: false,
        inGracePeriod: true,
        daysRemainingOrOverdue: -daysOverdue,
        reason: `Período de teste expirado há ${daysOverdue} dia(s), operando em período de carência (máx 5 dias).`,
        expiryDate: trialEndIso,
      };
    }

    // Teste ainda ativo e válido (dias restantes)
    const daysRemaining = Math.max(0, Math.ceil(-diffTime / (1000 * 60 * 60 * 24)));
    return {
      status: 'ACTIVE_TRIAL',
      isAllowed: true,
      isBlocked: false,
      inGracePeriod: false,
      daysRemainingOrOverdue: daysRemaining,
      reason: `Período de teste ativo (${daysRemaining} dias restantes).`,
      expiryDate: trialEndIso,
    };
  }

  // 6. Preservação de clientes com status ativo sem data explícita
  if (profile.status === 'active' || subscription?.status === 'active') {
    return {
      status: 'ACTIVE_PAID',
      isAllowed: true,
      isBlocked: false,
      inGracePeriod: false,
      daysRemainingOrOverdue: 30,
      reason: 'Assinante ativo no sistema.',
      expiryDate: null,
    };
  }

  // Se nenhum parâmetro foi detectado, libera provisoriamente em modo trial
  return {
    status: 'ACTIVE_TRIAL',
    isAllowed: true,
    isBlocked: false,
    inGracePeriod: false,
    daysRemainingOrOverdue: 14,
    reason: 'Novo cadastro em período de testes.',
    expiryDate: null,
  };
}

/**
 * Valida se um catálogo deve ser bloqueado na camada pública com base na assinatura
 * e status do perfil do proprietário (inadimplente, vencido > 5 dias ou desativado).
 */
export async function checkCatalogAccessStatus(
  params: {
    ownerUserId?: string | null;
    companyId?: string | null;
    representativeId?: string | null;
    slug?: string | null;
  },
  supabaseClient: any
): Promise<{ isBlocked: boolean; reason?: string; access?: AccessResolutionResult }> {
  // Catálogo oficial de demonstração nunca é bloqueado
  if (params.slug?.toLowerCase() === 'demo') {
    return { isBlocked: false };
  }

  try {
    // 1. Se houver representante individual especificado (ex: rota /catalogo/[slug]/[repSlug])
    if (params.representativeId) {
      const { data: repProfile } = await supabaseClient
        .from('profiles')
        .select('id, role, status, is_active, company_id, trial_ends_at, created_at, full_name, slug')
        .eq('id', params.representativeId)
        .maybeSingle();

      if (repProfile) {
        // Se o próprio representante foi desativado explicitamente
        if (repProfile.is_active === false || repProfile.status === 'inactive' || repProfile.status === 'blocked') {
          return {
            isBlocked: true,
            reason: 'Representante inativo ou suspenso.',
          };
        }
      }
    }

    // 2. Se houver ownerUserId (dono do catálogo individual)
    const targetUserId = params.ownerUserId || params.representativeId;
    if (targetUserId) {
      const [profileRes, subRes] = await Promise.all([
        supabaseClient
          .from('profiles')
          .select('id, role, status, is_active, company_id, trial_ends_at, created_at, full_name, slug')
          .eq('id', targetUserId)
          .maybeSingle(),
        supabaseClient
          .from('subscriptions')
          .select('status, price, plan_name, current_period_end')
          .eq('user_id', targetUserId)
          .maybeSingle(),
      ]);

      if (profileRes.data) {
        const access = resolveSubscriptionAccess(profileRes.data, subRes.data);
        if (access.isBlocked) {
          return {
            isBlocked: true,
            reason: access.reason,
            access,
          };
        }
      }
    }

    // 3. Se for uma Distribuidora (companyId), valida se a distribuidora tem licença ativa
    if (params.companyId) {
      const { data: companyAdmins } = await supabaseClient
        .from('profiles')
        .select('id, role, status, is_active, company_id, trial_ends_at, created_at')
        .eq('company_id', params.companyId)
        .in('role', ['admin_company', 'master', 'admin'])
        .limit(1);

      const adminUser = Array.isArray(companyAdmins) && companyAdmins.length > 0 ? companyAdmins[0] : null;
      if (adminUser) {
        const { data: sub } = await supabaseClient
          .from('subscriptions')
          .select('status, price, plan_name, current_period_end')
          .eq('user_id', adminUser.id)
          .maybeSingle();

        const access = resolveSubscriptionAccess(adminUser, sub);
        if (access.isBlocked) {
          return {
            isBlocked: true,
            reason: access.reason,
            access,
          };
        }
      }
    }

    return { isBlocked: false };
  } catch (err) {
    console.error('[checkCatalogAccessStatus] Erro ao verificar acesso ao catálogo:', err);
    return { isBlocked: false };
  }
}
