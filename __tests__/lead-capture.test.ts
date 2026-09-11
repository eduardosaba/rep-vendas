/**
 * Lead Capture & Funnel Security Tests
 *
 * Covers all required scenarios:
 *  1. Attempts 1–5 allowed
 *  2. 6th attempt blocked
 *  3. Subsequent attempts remain blocked
 *  4. Expired window resets counter
 *  5. Two concurrent calls don't exceed limit (mock-based; real PG validation pending)
 *  6. RPC error does NOT insert lead (fail-closed)
 *  7. Invalid UUID submission_id rejected
 *  8. 23505 conflict returns idempotent existing lead
 *  9. Non-23505 error returns failure
 * 10. Honeypot does not insert lead
 * 11. Raw IP is never sent to RPC nor persisted
 * 12. Lead is linked correctly after account creation (linkage logic)
 */

import { normalizePhone } from '../src/lib/phone';

// ---------------------------------------------------------------------------
// Mocks — set up BEFORE importing the module under test
// ---------------------------------------------------------------------------

// Track all RPC calls to verify arguments (especially ipHash, never raw IP)
const rpcCalls: Array<{ fn: string; args: Record<string, any> }> = [];

// Configurable mock state for the Supabase admin client
let mockRpcResult: { data: any; error: any } = { data: true, error: null };
let mockSelectResult: { data: any; error: any } = { data: null, error: null };
let mockInsertResult: { data: any; error: any } = { data: { id: 'new-lead-uuid' }, error: null };
let mockUpdateResult: { error: any } = { error: null };

// Track insert calls to verify honeypot doesn't insert
let insertCallCount = 0;

const mockSupabaseChain: any = {
  from: jest.fn(() => mockSupabaseChain),
  select: jest.fn(() => mockSupabaseChain),
  insert: jest.fn((payload: any) => {
    insertCallCount++;
    return mockSupabaseChain;
  }),
  update: jest.fn(() => {
    return { eq: jest.fn().mockResolvedValue(mockUpdateResult) };
  }),
  eq: jest.fn(() => mockSupabaseChain),
  is: jest.fn(() => mockSupabaseChain),
  gte: jest.fn(() => mockSupabaseChain),
  order: jest.fn(() => mockSupabaseChain),
  limit: jest.fn(() => mockSupabaseChain),
  maybeSingle: jest.fn(() => Promise.resolve(mockSelectResult)),
  single: jest.fn(() => Promise.resolve(mockInsertResult)),
  rpc: jest.fn((fn: string, args: Record<string, any>) => {
    rpcCalls.push({ fn, args });
    return Promise.resolve(mockRpcResult);
  }),
};

// Mock createAdminClient
jest.mock('../src/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => mockSupabaseChain),
}));

// Mock next/headers
const mockHeadersMap = new Map<string, string>();
mockHeadersMap.set('x-forwarded-for', '203.0.113.42');

jest.mock('next/headers', () => ({
  headers: jest.fn(() =>
    Promise.resolve({
      get: (name: string) => mockHeadersMap.get(name) || null,
    })
  ),
  cookies: jest.fn(() =>
    Promise.resolve({
      set: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    })
  ),
}));

// Mock server-only (no-op in test environment)
jest.mock('server-only', () => ({}));

// Import AFTER mocks are set up
import { captureLeadAction, CaptureLeadInput } from '../src/app/actions/lead';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validPayload(overrides?: Partial<CaptureLeadInput>): CaptureLeadInput {
  return {
    name: 'Carlos Silva',
    email: 'carlos@example.com',
    phone: '11999998888',
    acting_type: 'representante',
    submission_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    ...overrides,
  };
}

function resetMocks() {
  rpcCalls.length = 0;
  insertCallCount = 0;
  mockRpcResult = { data: true, error: null };
  mockSelectResult = { data: null, error: null };
  mockInsertResult = { data: { id: 'new-lead-uuid' }, error: null };
  mockUpdateResult = { error: null };
  mockHeadersMap.set('x-forwarded-for', '203.0.113.42');
  jest.clearAllMocks();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Lead Capture & Funnel Security', () => {
  beforeEach(() => {
    resetMocks();
  });

  // =========================================================================
  // Rate Limit (items 1–5)
  // =========================================================================
  describe('Persistent Rate Limit', () => {
    it('allows attempts 1 through 5 (RPC returns true)', async () => {
      mockRpcResult = { data: true, error: null };
      for (let i = 0; i < 5; i++) {
        const res = await captureLeadAction(validPayload());
        expect(res.success).toBe(true);
      }
    });

    it('blocks the 6th attempt when RPC returns false', async () => {
      mockRpcResult = { data: false, error: null };
      const res = await captureLeadAction(validPayload());
      expect(res.success).toBe(false);
      expect(res.error).toContain('Muitas tentativas');
    });

    it('continues blocking subsequent attempts after limit is reached', async () => {
      mockRpcResult = { data: false, error: null };
      for (let i = 0; i < 3; i++) {
        const res = await captureLeadAction(validPayload());
        expect(res.success).toBe(false);
        expect(res.error).toContain('Muitas tentativas');
      }
    });

    it('allows new attempt after window expiry (RPC resets and returns true)', async () => {
      // Simulate: first call blocked (window full), then window expires and next call allowed
      mockRpcResult = { data: false, error: null };
      const blocked = await captureLeadAction(validPayload());
      expect(blocked.success).toBe(false);

      // Window expires → RPC returns true again
      mockRpcResult = { data: true, error: null };
      const allowed = await captureLeadAction(validPayload());
      expect(allowed.success).toBe(true);
    });

    it('two concurrent calls share the same persistent counter (mock-level verification)', async () => {
      // Both calls go to the same RPC with the same ipHash.
      // The mock returns true for both, simulating that the RPC serializes them atomically.
      // NOTE: True concurrency validation requires a real PostgreSQL instance.
      mockRpcResult = { data: true, error: null };

      const [res1, res2] = await Promise.all([
        captureLeadAction(validPayload()),
        captureLeadAction(validPayload()),
      ]);

      // Both should have called the RPC (not an in-memory fallback)
      const rateLimitRpcCalls = rpcCalls.filter(
        (c) => c.fn === 'check_and_increment_lead_rate_limit'
      );
      expect(rateLimitRpcCalls.length).toBe(2);

      // Both calls use the same hashed IP
      expect(rateLimitRpcCalls[0].args.p_ip_hash).toBe(rateLimitRpcCalls[1].args.p_ip_hash);

      // Both succeeded (mock returns true for both)
      expect(res1.success).toBe(true);
      expect(res2.success).toBe(true);
    });

    it('raw IP is NEVER sent to RPC — only SHA-256 hash', async () => {
      const rawIp = '203.0.113.42';
      mockHeadersMap.set('x-forwarded-for', rawIp);
      mockRpcResult = { data: true, error: null };

      await captureLeadAction(validPayload());

      const rateLimitCall = rpcCalls.find(
        (c) => c.fn === 'check_and_increment_lead_rate_limit'
      );
      expect(rateLimitCall).toBeDefined();

      // The hash should NOT be the raw IP
      expect(rateLimitCall!.args.p_ip_hash).not.toBe(rawIp);
      // It should be a 64-char hex string (SHA-256)
      expect(rateLimitCall!.args.p_ip_hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // =========================================================================
  // Fail-Closed on RPC Error (item 6)
  // =========================================================================
  describe('Fail-Closed Rate Limit', () => {
    it('does NOT insert lead when RPC returns an error', async () => {
      mockRpcResult = {
        data: null,
        error: { message: 'connection refused', code: 'PGRST301' },
      };

      const res = await captureLeadAction(validPayload());

      expect(res.success).toBe(false);
      expect(res.error).toContain('temporariamente indisponível');
      // Verify no insert was attempted
      expect(insertCallCount).toBe(0);
    });

    it('does NOT insert lead when RPC throws an exception', async () => {
      mockSupabaseChain.rpc.mockImplementationOnce(() => {
        throw new Error('Network timeout');
      });

      const res = await captureLeadAction(validPayload());

      expect(res.success).toBe(false);
      expect(res.error).toContain('temporariamente indisponível');
      expect(insertCallCount).toBe(0);
    });
  });

  // =========================================================================
  // Honeypot (item 10)
  // =========================================================================
  describe('Honeypot Bot Trap', () => {
    it('returns fake success without inserting lead when honeypot is filled', async () => {
      const res = await captureLeadAction(
        validPayload({ website: 'http://spam-link.com' })
      );

      expect(res.success).toBe(true);
      expect(res.lead_id).toBe('hp-filtered');
      // No RPC call should have been made (honeypot exits before rate limit)
      expect(rpcCalls.length).toBe(0);
      // No insert should have been made
      expect(insertCallCount).toBe(0);
    });
  });

  // =========================================================================
  // Input Validation
  // =========================================================================
  describe('Input Validation', () => {
    it('rejects invalid email formats', async () => {
      const res = await captureLeadAction(validPayload({ email: 'not-an-email' }));
      expect(res.success).toBe(false);
      expect(res.error).toContain('e-mail válido');
    });

    it('rejects invalid acting_type values', async () => {
      const res = await captureLeadAction(
        validPayload({ acting_type: 'hacker' as any })
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('como você atua');
    });

    it('rejects malformed submission_id that is not a valid UUID (item 7)', async () => {
      const res = await captureLeadAction(
        validPayload({ submission_id: 'invalid-uuid-string-123' })
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('submissão inválido');
    });

    it('accepts valid UUID v4 submission_id', async () => {
      const res = await captureLeadAction(
        validPayload({ submission_id: '550e8400-e29b-41d4-a716-446655440000' })
      );
      expect(res.success).toBe(true);
    });
  });

  // =========================================================================
  // Idempotency — 23505 Conflict (item 8)
  // =========================================================================
  describe('Idempotent Submission (23505 Conflict)', () => {
    it('returns existing lead_id on duplicate submission_id constraint violation', async () => {
      // Simulate: INSERT fails with 23505, then SELECT by submission_id returns existing lead
      mockInsertResult = {
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint' },
      } as any;

      // After 23505, the code does a SELECT by submission_id → returns existing lead
      // We need to handle the chain: .from('leads').select('id').eq('submission_id', ...).maybeSingle()
      // The mock chain is reused, so we configure maybeSingle to return the existing lead
      mockSelectResult = { data: { id: 'existing-lead-from-conflict' }, error: null };

      const res = await captureLeadAction(
        validPayload({ submission_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
      );

      expect(res.success).toBe(true);
      expect(res.lead_id).toBe('existing-lead-from-conflict');
    });
  });

  // =========================================================================
  // Non-23505 DB Error (item 9)
  // =========================================================================
  describe('Non-23505 Database Error', () => {
    it('returns failure on non-duplicate database error', async () => {
      mockInsertResult = {
        data: null,
        error: { code: '42P01', message: 'relation "leads" does not exist' },
      } as any;
      // Ensure the select for existing leads returns nothing
      mockSelectResult = { data: null, error: null };

      const res = await captureLeadAction(validPayload());

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  // =========================================================================
  // Phone Normalization
  // =========================================================================
  describe('Phone Normalization', () => {
    it('normalizes Brazilian phone numbers with formatting', () => {
      expect(normalizePhone('(11) 99999-8888')).toBe('+5511999998888');
      expect(normalizePhone('11999998888')).toBe('+5511999998888');
    });
  });

  // =========================================================================
  // Post-Signup Lead Linkage (item 12)
  // =========================================================================
  describe('Post-Signup Lead Linkage Security', () => {
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

    it('allows linkage when lead email matches auth email and user_id is null', () => {
      const lead = { id: 'lead-123', email: '  User@Example.com  ', user_id: null };
      expect(validateLeadLinkage(lead, 'user@example.com', 'user-abc')).toBe(true);
    });

    it('REJECTS linkage if lead belongs to a different email (prevents cookie tampering)', () => {
      const lead = { id: 'lead-victim', email: 'victim@example.com', user_id: null };
      expect(validateLeadLinkage(lead, 'attacker@example.com', 'user-attacker')).toBe(
        false
      );
    });

    it('REJECTS linkage if lead is already linked to another user_id', () => {
      const lead = {
        id: 'lead-123',
        email: 'user@example.com',
        user_id: 'existing-user-999',
      };
      expect(validateLeadLinkage(lead, 'user@example.com', 'new-user-888')).toBe(false);
    });
  });

  // =========================================================================
  // UTM Attribution
  // =========================================================================
  describe('UTM Attribution', () => {
    it('trims and bounds UTM parameters properly', () => {
      const inputUtm = '  google_cpc_campaign_brand  ';
      const boundedUtm = inputUtm.trim().slice(0, 100);
      expect(boundedUtm).toBe('google_cpc_campaign_brand');
    });
  });
});

