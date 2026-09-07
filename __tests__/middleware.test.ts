// Polyfill Request (used internally by next/server when imported in tests)
(global as any).Request = (global as any).Request || class {};

const mockClient: any = {
  auth: {
    getUser: jest.fn(),
  },
};

// Provide a minimal mock for `from(...).select(...).eq(...).maybeSingle()` used by middleware
mockClient.from = jest.fn(() => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest
    .fn()
    .mockResolvedValue({ data: { onboarding_completed: true, role: 'user' } }),
}));

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockClient),
}));

// Provide minimal environment variables for test
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

// Import AFTER mocks and polyfills to avoid runtime issues during module init
class MockNextResponse {
  status: number;
  body: any;
  headers = new Map();
  cookies = { getAll: () => [], set: jest.fn() };
  constructor(body?: any, opts?: any) {
    this.body = body;
    this.status = opts?.status || 200;
  }
  static next(opts?: any) {
    return new MockNextResponse(null, { status: 200 });
  }
  static redirect(url: any) {
    const res = new MockNextResponse(null, { status: 307 });
    const loc = url.toString ? url.toString().replace('http://example.com', '') : (url.pathname || url);
    res.headers.set('location', loc);
    return res;
  }
  static json(data: any, opts?: any) {
    return new MockNextResponse(data, opts);
  }
}

jest.mock('next/server', () => ({
  NextResponse: MockNextResponse,
  NextRequest: class {},
}));

const { middleware } = require('@/middleware');

function makeRequest(path: string) {
  const urlObj = new URL(`http://example.com${path}`);
  return {
    nextUrl: {
      pathname: urlObj.pathname,
      searchParams: urlObj.searchParams,
      clone() {
        return {
          pathname: urlObj.pathname,
          searchParams: urlObj.searchParams,
          toString() {
            return urlObj.toString();
          },
        };
      },
    },
    url: `http://example.com${path}`,
    cookies: {
      getAll: jest.fn(() => []),
      set: jest.fn(),
    },
    headers: new Map(),
  } as any;
}

describe('middleware router helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /login when no user and accessing /dashboard', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest('/dashboard');

    const res: any = await middleware(req);

    const location = res.headers.get('location') || res.headers.get('Location');
    expect(res.status).toBe(307);
    expect(location).toContain('/login');
  });

  it('redirects logged active user away from /login to /dashboard', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'rep', is_active: true } }),
    });

    const req = makeRequest('/login');
    const res: any = await middleware(req);

    const location = res.headers.get('location') || res.headers.get('Location');
    expect(res.status).toBe(307);
    expect(location).toContain('/dashboard');
  });

  it('bypasses profile query for public catalog routes (/catalogo)', async () => {
    const req = makeRequest('/catalogo');
    const res: any = await middleware(req);

    expect(res.status).toBe(200);
    expect(mockClient.auth.getUser).not.toHaveBeenCalled();
  });

  it('redirects disabled user accessing /dashboard to /login?error=account_disabled', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-disabled' } } });
    mockClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'rep', is_active: false } }),
    });

    const req = makeRequest('/dashboard');
    const res: any = await middleware(req);

    const location = res.headers.get('location') || res.headers.get('Location');
    expect(res.status).toBe(307);
    expect(location).toContain('/login?error=account_disabled');
  });

  it('avoids redirect loop when disabled user is on /login?error=account_disabled', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-disabled' } } });
    mockClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'rep', is_active: false } }),
    });

    const req = makeRequest('/login?error=account_disabled');
    const res: any = await middleware(req);

    expect(res.status).toBe(200);
  });

  it('returns 403 Forbidden when disabled user attempts to call protected API', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-disabled' } } });
    mockClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { role: 'admin', is_active: false } }),
    });

    const req = makeRequest('/api/admin/users');
    const res: any = await middleware(req);

    expect(res.status).toBe(403);
  });
});
