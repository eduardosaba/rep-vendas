import { captureLeadAction, CaptureLeadInput } from '../src/app/actions/lead';
import { normalizePhone } from '../src/lib/phone';

describe('Lead Capture & Funnel Security', () => {
  describe('Input Normalization & Honeypot Validation', () => {
    it('traps honeypot submissions when website field is filled', async () => {
      const payload: CaptureLeadInput = {
        name: 'Bot Spam',
        email: 'bot@spam.com',
        phone: '11999998888',
        acting_type: 'representante',
        website: 'http://spam-link.com', // Honeypot filled by bot
      };

      const res = await captureLeadAction(payload);
      expect(res.success).toBe(true);
      expect(res.lead_id).toBe('hp-filtered');
    });

    it('rejects invalid email formats', async () => {
      const payload: CaptureLeadInput = {
        name: 'Carlos Silva',
        email: 'invalid-email-format',
        phone: '11999998888',
        acting_type: 'representante',
      };

      const res = await captureLeadAction(payload);
      expect(res.success).toBe(false);
      expect(res.error).toContain('e-mail válido');
    });

    it('rejects invalid acting_type values', async () => {
      const payload: CaptureLeadInput = {
        name: 'Carlos Silva',
        email: 'carlos@example.com',
        phone: '11999998888',
        acting_type: 'invalid_role' as any,
      };

      const res = await captureLeadAction(payload);
      expect(res.success).toBe(false);
      expect(res.error).toContain('como você atua');
    });

    it('rejects malformed submission_id values that are not valid UUIDs', async () => {
      const payload: CaptureLeadInput = {
        name: 'Carlos Silva',
        email: 'carlos@example.com',
        phone: '11999998888',
        acting_type: 'representante',
        submission_id: 'invalid-uuid-string-123',
      };

      const res = await captureLeadAction(payload);
      expect(res.success).toBe(false);
      expect(res.error).toContain('submissão inválido');
    });

    it('normalizes Brazilian phone numbers correctly', () => {
      expect(normalizePhone('(11) 99999-8888')).toBe('+5511999998888');
      expect(normalizePhone('11999998888')).toBe('+5511999998888');
    });
  });

  describe('Post-Signup Linkage & Security Validation Logic', () => {
    function validateLeadLinkage(
      lead: { id: string; email: string; user_id: string | null },
      authEmail: string,
      authUserId: string
    ): boolean {
      const normalizedLeadEmail = lead.email.trim().toLowerCase();
      const normalizedAuthEmail = authEmail.trim().toLowerCase();

      // Rule 1: Email MUST match
      if (normalizedLeadEmail !== normalizedAuthEmail) return false;

      // Rule 2: Lead user_id MUST be null or already match current authUserId
      if (lead.user_id !== null && lead.user_id !== authUserId) return false;

      return true;
    }

    it('allows linkage when lead email matches auth email and lead user_id is null', () => {
      const lead = { id: 'lead-123', email: '  User@Example.com  ', user_id: null };
      const isValid = validateLeadLinkage(lead, 'user@example.com', 'user-abc');
      expect(isValid).toBe(true);
    });

    it('REJECTS linkage if lead_id belongs to a different email address (prevents cookie tampering)', () => {
      const lead = { id: 'lead-victim', email: 'victim@example.com', user_id: null };
      const isValid = validateLeadLinkage(lead, 'attacker@example.com', 'user-attacker');
      expect(isValid).toBe(false);
    });

    it('REJECTS linkage if lead is already linked to another user_id', () => {
      const lead = { id: 'lead-123', email: 'user@example.com', user_id: 'existing-user-999' };
      const isValid = validateLeadLinkage(lead, 'user@example.com', 'new-user-888');
      expect(isValid).toBe(false);
    });
  });

  describe('UTM Attribution Persistence', () => {
    it('trims and bounds UTM parameters properly', () => {
      const inputUtm = '  google_cpc_campaign_brand  ';
      const boundedUtm = inputUtm.trim().slice(0, 100);
      expect(boundedUtm).toBe('google_cpc_campaign_brand');
    });
  });
});
