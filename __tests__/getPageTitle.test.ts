import getPageTitle from '@/lib/routeTitles';

describe('getPageTitle', () => {
  it('returns Dashboard for root dashboard', () => {
    expect(getPageTitle('/dashboard')).toBe('📈 Dashboard');
  });

  it('returns Ferramentas for products sync route', () => {
    expect(getPageTitle('/dashboard/products/sync/some-tool')).toBe('🛒 Ferramentas');
  });

  it('returns Produtos for product routes', () => {
    expect(getPageTitle('/dashboard/products/123')).toBe('📦 Produtos');
  });

  it('falls back to Dashboard for unknown routes', () => {
    expect(getPageTitle('/dashboard/unknown/path')).toBe('📈 Dashboard');
  });
});
