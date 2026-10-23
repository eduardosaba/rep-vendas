import { resolveSubscriptionAccess } from '@/lib/auth/subscription-rules';

describe('Canonical Subscription Access Rules (RepVendas)', () => {
  const referenceDate = new Date('2026-10-21T12:00:00.000Z');

  describe('1. Global Admins (Master & Admin)', () => {
    it('deve sempre liberar acesso irrestrito para usuários master', () => {
      const res = resolveSubscriptionAccess(
        { id: 'usr-master', role: 'master', status: 'active' },
        null,
        referenceDate
      );
      expect(res.status).toBe('ACTIVE_MASTER');
      expect(res.isAllowed).toBe(true);
      expect(res.isBlocked).toBe(false);
    });

    it('deve liberar acesso mesmo se houver subscription expirada no registro', () => {
      const res = resolveSubscriptionAccess(
        { id: 'usr-admin', role: 'admin', status: 'active' },
        { status: 'expired', current_period_end: '2026-01-01T00:00:00Z' },
        referenceDate
      );
      expect(res.status).toBe('ACTIVE_MASTER');
      expect(res.isAllowed).toBe(true);
    });
  });

  describe('2. Membros de Equipe de Distribuidora (Licença Corporativa)', () => {
    it('deve liberar acesso para representante vinculado a empresa mesmo em status trial', () => {
      const res = resolveSubscriptionAccess(
        {
          id: 'usr-rep-team',
          role: 'rep',
          status: 'trial',
          company_id: 'comp-123-distributor',
          trial_ends_at: '2026-09-01T00:00:00Z', // vencido há mais de 50 dias
        },
        null,
        referenceDate
      );
      expect(res.status).toBe('ACTIVE_TEAM');
      expect(res.isAllowed).toBe(true);
      expect(res.isBlocked).toBe(false);
    });
  });

  describe('3. Assinantes Pagantes Ativos (Preservação da Base)', () => {
    it('NUNCA deve bloquear cliente com profile.status active, mesmo com data legada', () => {
      const res = resolveSubscriptionAccess(
        {
          id: 'usr-paying-legacy',
          role: 'rep',
          status: 'active',
          trial_ends_at: null,
        },
        {
          status: 'active',
          price: 50,
          current_period_end: '2026-06-01T00:00:00Z', // data antiga no webhook
        },
        referenceDate
      );
      expect(res.status).toBe('ACTIVE_PAID');
      expect(res.isAllowed).toBe(true);
      expect(res.isBlocked).toBe(false);
    });

    it('deve liberar cliente com subscription ativa sem data explícita', () => {
      const res = resolveSubscriptionAccess(
        {
          id: 'usr-paying-sub',
          role: 'rep',
          status: 'active',
        },
        {
          status: 'active',
          price: 99,
          plan_name: 'Plano Pro Mensal',
        },
        referenceDate
      );
      expect(res.status).toBe('ACTIVE_PAID');
      expect(res.isAllowed).toBe(true);
    });
  });

  describe('4. Usuários em Teste Gratuito (Trial)', () => {
    it('deve permitir acesso para teste ativo com dias restantes', () => {
      const res = resolveSubscriptionAccess(
        {
          id: 'usr-trial-active',
          role: 'rep',
          status: 'trial',
          trial_ends_at: '2026-10-28T12:00:00.000Z', // +7 dias
        },
        {
          status: 'trial',
          current_period_end: '2026-10-28T12:00:00.000Z',
        },
        referenceDate
      );
      expect(res.status).toBe('ACTIVE_TRIAL');
      expect(res.isAllowed).toBe(true);
      expect(res.isBlocked).toBe(false);
      expect(res.daysRemainingOrOverdue).toBeGreaterThan(0);
    });

    it('deve conceder período de carência (tolerância) quando vencido há <= 5 dias', () => {
      const res = resolveSubscriptionAccess(
        {
          id: 'usr-trial-grace',
          role: 'rep',
          status: 'trial',
          trial_ends_at: '2026-10-18T12:00:00.000Z', // venceu há 3 dias
        },
        null,
        referenceDate
      );
      expect(res.status).toBe('GRACE_PERIOD_TRIAL');
      expect(res.isAllowed).toBe(true);
      expect(res.isBlocked).toBe(false);
      expect(res.inGracePeriod).toBe(true);
      expect(res.daysRemainingOrOverdue).toBe(-3);
    });

    it('deve BLOQUEAR estritamente teste vencido há mais de 5 dias', () => {
      const res = resolveSubscriptionAccess(
        {
          id: 'usr-trial-expired-hard',
          role: 'rep',
          status: 'trial',
          trial_ends_at: '2026-09-20T12:00:00.000Z', // venceu há ~31 dias
        },
        null,
        referenceDate
      );
      expect(res.status).toBe('BLOCKED_TRIAL');
      expect(res.isAllowed).toBe(false);
      expect(res.isBlocked).toBe(true);
      expect(res.inGracePeriod).toBe(false);
    });

    it('deve utilizar fallback de 14 dias a partir de created_at se datas forem nulas', () => {
      const res = resolveSubscriptionAccess(
        {
          id: 'usr-trial-fallback',
          role: 'rep',
          status: 'trial',
          created_at: '2026-10-15T12:00:00.000Z', // 6 dias atrás
          trial_ends_at: null,
        },
        null,
        referenceDate
      );
      expect(res.status).toBe('ACTIVE_TRIAL');
      expect(res.isAllowed).toBe(true);
    });
  });

  describe('5. Bloqueio Administrativo', () => {
    it('deve bloquear imediatamente conta com is_active === false', () => {
      const res = resolveSubscriptionAccess(
        {
          id: 'usr-disabled',
          role: 'rep',
          status: 'active',
          is_active: false,
        },
        null,
        referenceDate
      );
      expect(res.status).toBe('BLOCKED_ADMIN');
      expect(res.isAllowed).toBe(false);
      expect(res.isBlocked).toBe(true);
    });

    it('deve bloquear conta com status inactive ou blocked', () => {
      const res = resolveSubscriptionAccess(
        {
          id: 'usr-blocked',
          role: 'rep',
          status: 'blocked',
        },
        null,
        referenceDate
      );
      expect(res.status).toBe('BLOCKED_ADMIN');
      expect(res.isAllowed).toBe(false);
      expect(res.isBlocked).toBe(true);
    });
  });
});
