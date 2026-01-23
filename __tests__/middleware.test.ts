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

// Import AFTER mocks and polyfills to avoid runtime issues during module init
jest.mock('next/server', () => ({
  NextResponse: {
    next: (opts: any) => ({
      status: 200,
      headers: new Map(),
      cookies: { set: jest.fn() },
    }),
    redirect: (url: any) => {
      const headers = new Map();
      headers.set('location', url.pathname || url.toString());
      return { status: 307, headers };
    },
  },
  NextRequest: class {},
}));

const { updateSession } = require('@/lib/supabase/middleware');

function makeRequest(path: string) {
  return {
    nextUrl: {
      pathname: path,
      clone() {
        return {
          pathname: path,
          toString() {
            return `http://example.com${path}`;
          },
        };
      },
    },
    url: `http://example.com${path}`,
    cookies: {
      getAll: jest.fn(() => []),
      set: jest.fn(),
    },
  } as any;
}

describe('updateSession middleware helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /login when no user and accessing /dashboard', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest('/dashboard');

    const res: any = await updateSession(req);

    const location = res.headers.get('location') || res.headers.get('Location');
    expect(res.status).toBe(307);
    expect(location).toContain('/login');
  });

  it('redirects logged user away from /login to /dashboard', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const req = makeRequest('/login');

    const res: any = await updateSession(req);

    const location = res.headers.get('location') || res.headers.get('Location');
    expect(res.status).toBe(307);
    expect(location).toContain('/dashboard');
  });

  it('returns next response when user present and accessing other paths', async () => {
    mockClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    const req = makeRequest('/some-public');

    const res: any = await updateSession(req);
    expect(res.status).toBe(200);
  });
});
