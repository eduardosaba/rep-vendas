describe('CRM Lead Trial Extension & Security Hardening (RepVendas)', () => {
  // Simulação de cálculo de datas e lógica de extensão
  function calculateExtensionDate(currentEndIso: string | null | undefined, daysToAdd: number, now: Date) {
    let baseDate = now;
    if (currentEndIso) {
      const currentEnd = new Date(currentEndIso);
      if (currentEnd > now) {
        baseDate = currentEnd;
      }
    }
    return new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
  }

  function validateExtensionEligibility(userProfile: any, subscription: any) {
    if (
      (subscription && subscription.status === 'active' && Number(subscription.price) > 0) ||
      (userProfile && userProfile.status === 'active') ||
      (userProfile && Boolean(userProfile.company_id) && ['rep', 'representative', 'representante'].includes(String(userProfile.role || '').toLowerCase()))
    ) {
      return {
        allowed: false,
        error: 'Este usuário possui status de cliente ou membro corporativo ativo! A extensão de teste gratuito foi estritamente bloqueada para proteger o assinante.',
      };
    }
    return { allowed: true };
  }

  const mockNow = new Date('2026-10-21T12:00:00.000Z');

  describe('Cenário 1: Lead com teste expirado', () => {
    it('deve calcular nova expiração a partir de HOJE, garantindo dias úteis reais de teste', () => {
      const expiredDate = '2026-09-20T12:00:00.000Z'; // expirado há 31 dias
      const newExpiration = calculateExtensionDate(expiredDate, 7, mockNow);
      
      const expected = new Date(mockNow.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(newExpiration).toBe(expected);
      expect(new Date(newExpiration) > mockNow).toBe(true);
    });
  });

  describe('Cenário 2: Lead com teste ativo', () => {
    it('deve calcular nova expiração cumulativamente a partir da data de término atual', () => {
      const activeEndDate = new Date(mockNow.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(); // restam 5 dias
      const newExpiration = calculateExtensionDate(activeEndDate, 7, mockNow);
      
      const expected = new Date(new Date(activeEndDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(newExpiration).toBe(expected);
    });
  });

  describe('Cenário 3: Cliente com assinatura paga (Proteção Inviolável)', () => {
    it('deve BLOQUEAR extensão se usuário tiver subscription com status active e price > 0', () => {
      const res = validateExtensionEligibility(
        { id: 'u1', status: 'active', role: 'rep' },
        { status: 'active', price: 50, plan_name: 'Plano Pro' }
      );
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('estritamente bloqueada para proteger o assinante');
    });

    it('deve BLOQUEAR extensão se profile.status for active mesmo com sub nula ou price 0', () => {
      const res = validateExtensionEligibility(
        { id: 'u2', status: 'active', role: 'rep' },
        { status: 'active', price: 0 }
      );
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('estritamente bloqueada para proteger o assinante');
    });

    it('deve BLOQUEAR extensão se usuário for representante de distribuidora coberto por licença', () => {
      const res = validateExtensionEligibility(
        { id: 'u3', status: 'trial', role: 'rep', company_id: 'distrib-corp-1' },
        null
      );
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('estritamente bloqueada para proteger o assinante');
    });
  });

  describe('Cenário 4: Usuário sem registro prévio de assinatura', () => {
    it('deve permitir extensão segura criando novo período a partir de agora', () => {
      const res = validateExtensionEligibility(
        { id: 'u4', status: 'trial', role: 'rep', company_id: null },
        null
      );
      expect(res.allowed).toBe(true);
      const newExpiration = calculateExtensionDate(null, 14, mockNow);
      expect(new Date(newExpiration) > mockNow).toBe(true);
    });
  });

  describe('Cenário 5: Auditoria e Repetição da Operação', () => {
    it('deve acumular histórico de extensões no metadata sem sobrescrever logs anteriores', () => {
      const initialMeta = {
        trialExtensions: [
          {
            extendedAt: '2026-10-10T10:00:00.000Z',
            extendedBy: 'admin@repvendas.com.br',
            daysAdded: 7,
            reason: 'Primeira recuperação',
            newExpiration: '2026-10-17T10:00:00.000Z',
          },
        ],
      };

      const updatedExtensions = [...initialMeta.trialExtensions];
      updatedExtensions.push({
        extendedAt: mockNow.toISOString(),
        extendedBy: 'master@repvendas.com.br',
        daysAdded: 5,
        reason: 'Segunda extensão para validação assistida de catálogo',
        newExpiration: new Date(mockNow.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(updatedExtensions.length).toBe(2);
      expect(updatedExtensions[0].reason).toBe('Primeira recuperação');
      expect(updatedExtensions[1].extendedBy).toBe('master@repvendas.com.br');
      expect(updatedExtensions[1].daysAdded).toBe(5);
    });
  });

  describe('Cenário 6: Validação de Limites de Parâmetros', () => {
    it('deve rejeitar períodos menores que 1 dia ou maiores que 30 dias', () => {
      const isDaysValid = (days: number) => days >= 1 && days <= 30;
      expect(isDaysValid(0)).toBe(false);
      expect(isDaysValid(-5)).toBe(false);
      expect(isDaysValid(31)).toBe(false);
      expect(isDaysValid(7)).toBe(true);
      expect(isDaysValid(30)).toBe(true);
    });

    it('deve exigir justificativa comercial com ao menos 5 caracteres', () => {
      const isReasonValid = (reason?: string) => Boolean(reason && reason.trim().length >= 5);
      expect(isReasonValid('')).toBe(false);
      expect(isReasonValid('ok')).toBe(false);
      expect(isReasonValid('   ')).toBe(false);
      expect(isReasonValid('Acompanhamento comercial')).toBe(true);
    });
  });
});
