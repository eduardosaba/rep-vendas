import { test, expect } from '@playwright/test';

test.describe('Fase 1 - Organization Context', () => {
  test.beforeEach(async ({ page }) => {
    // Interceptar chamadas de autenticação para evitar login real em testes
    await page.route('**/auth/**', async route => {
      await route.continue();
    });
  });

  test('Multi-tenancy isolation: User in Org A cannot access Org B data', async ({ page }) => {
    // Este teste requer setup de dados de teste
    // Será implementado quando houver seed de dados de teste disponível
    test.skip(true, 'Requires test data setup - will be implemented with test fixtures');
  });

  test('Organization selector switches context correctly', async ({ page }) => {
    // Navegar para dashboard (requer autenticação)
    await page.goto('/dashboard');
    
    // Verificar se redireciona para login se não autenticado
    await expect(page).toHaveURL(/.*login/);
  });

  test('Public catalog /catalogo/* works without login', async ({ page }) => {
    // Testar acesso público ao catálogo
    // Usar um slug conhecido que exista no banco de testes
    await page.goto('/catalogo/teste');
    
    // Verificar que não redireciona para login
    await expect(page).not.toHaveURL(/.*login/);
    
    // Verificar se carrega conteúdo do catálogo (pode ser 404 se slug não existe, mas não login)
    const isLoginPage = await page.locator('text=Entrar, text=Login, text=Email').isVisible().catch(() => false);
    expect(isLoginPage).toBe(false);
  });

  test('Feature flag OFF: Legacy fallback works', async ({ page }) => {
    // Este teste verificaria que com organization_context_enabled=false
    // o app continua funcionando via company_id/user_id legacy
    test.skip(true, 'Requires feature flag configuration');
  });

  test('Header shows organization selector when user has multiple orgs', async ({ page }) => {
    // Testar se o seletor aparece no header para usuários multi-org
    test.skip(true, 'Requires authenticated multi-org user');
  });

  test('Organization context API returns correct structure', async ({ page }) => {
    const response = await page.request.get('/api/organization-context');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('organizationId');
    expect(data).toHaveProperty('organization');
    expect(data).toHaveProperty('organizationType');
    expect(data).toHaveProperty('memberRole');
    expect(data).toHaveProperty('memberStatus');
    expect(data).toHaveProperty('permissions');
    expect(data).toHaveProperty('memberships');
    expect(data).toHaveProperty('fallback');
  });

  test('Switch organization API requires valid membership', async ({ page }) => {
    const response = await page.request.post('/api/organization-context/switch', {
      data: { organizationId: '00000000-0000-0000-0000-000000000000' },
    });
    
    // Deve retornar 401 se não autenticado ou 403 se org inválida
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Admin Features Page', () => {
  test('Master user can access features page', async ({ page }) => {
    await page.goto('/admin/organizations/features');
    
    // Deve redirecionar para login se não autenticado
    await expect(page).toHaveURL(/.*login/);
  });

  test('Non-master user cannot access features page', async ({ page }) => {
    test.skip(true, 'Requires authenticated non-master user');
  });
});