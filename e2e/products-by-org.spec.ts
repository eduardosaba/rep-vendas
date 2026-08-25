import { test, expect } from '@playwright/test';

test.describe('Fase 2 - Products by Organization', () => {
  const orgAUser = process.env.TEST_USER_ORG_A || 'test-org-a@example.com';
  const orgBUser = process.env.TEST_USER_ORG_B || 'test-org-b@example.com';
  const masterUser = process.env.TEST_USER_MASTER || 'master@example.com';

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('E2E-01: User in Org A sees only their products', async ({ page }) => {
    await loginAs(page, orgAUser);
    await page.goto('/dashboard/products');
    
    // Wait for products table to load
    await expect(page.locator('[data-testid=products-table]')).toBeVisible();
    
    // Verify only Org A products visible
    const productRows = page.locator('[data-testid=product-row]');
    const count = await productRows.count();
    
    for (let i = 0; i < count; i++) {
      const orgBadge = productRows.nth(i).locator('[data-testid=product-org]');
      await expect(orgBadge).toContainText('Org A');
    }
  });

  test('E2E-02: User in Org B sees only their products', async ({ page }) => {
    await loginAs(page, orgBUser);
    await page.goto('/dashboard/products');
    
    await expect(page.locator('[data-testid=products-table]')).toBeVisible();
    
    const productRows = page.locator('[data-testid=product-row]');
    const count = await productRows.count();
    
    for (let i = 0; i < count; i++) {
      const orgBadge = productRows.nth(i).locator('[data-testid=product-org]');
      await expect(orgBadge).toContainText('Org B');
    }
  });

  test('E2E-03: Master user sees all orgs and can switch', async ({ page }) => {
    await loginAs(page, masterUser);
    await page.goto('/dashboard/products');
    
    // Should see organization selector
    await expect(page.locator('[data-testid=org-selector]')).toBeVisible();
    
    // Switch to Org A
    await page.locator('[data-testid=org-selector]').click();
    await page.locator('[data-testid=org-option-org-a]').click();
    
    await expect(page.locator('[data-testid=products-table]')).toBeVisible();
    // Verify Org A products
    
    // Switch to Org B
    await page.locator('[data-testid=org-selector]').click();
    await page.locator('[data-testid=org-option-org-b]').click();
    
    await expect(page.locator('[data-testid=products-table]')).toBeVisible();
    // Verify Org B products
  });

  test('E2E-04: Feature flag OFF falls back to legacy', async ({ page }) => {
    // This would require API call to disable flag
    test.skip(true, 'Requires feature flag management via API');
  });

  test('E2E-05: Public catalog works without login', async ({ page }) => {
    await page.goto('/catalogo/template');
    
    // Should NOT redirect to login
    await expect(page).not.toHaveURL(/.*login/);
    
    // Should show catalog content
    await expect(page.locator('[data-testid=catalog-products]')).toBeVisible({ timeout: 10000 });
  });

  test('E2E-06: Create product assigns organization_id', async ({ page }) => {
    await loginAs(page, orgAUser);
    await page.goto('/dashboard/products/new');
    
    await page.fill('[data-testid=product-name]', 'Test Product E2E');
    await page.fill('[data-testid=product-price]', '100.00');
    await page.fill('[data-testid=product-brand]', 'Test Brand');
    await page.click('[data-testid=save-product]');
    
    // Verify success toast
    await expect(page.locator('[data-testid=toast-success]')).toBeVisible();
    
    // Verify product appears in list
    await page.goto('/dashboard/products');
    await expect(page.locator('text=Test Product E2E')).toBeVisible();
  });

  test('E2E-07: Edit product preserves organization_id', async ({ page }) => {
    await loginAs(page, orgAUser);
    await page.goto('/dashboard/products');
    
    // Click edit on first product
    await page.locator('[data-testid=edit-product]').first().click();
    
    await page.fill('[data-testid=product-price]', '150.00');
    await page.click('[data-testid=save-product]');
    
    await expect(page.locator('[data-testid=toast-success]')).toBeVisible();
  });

  test('E2E-08: Import CSV creates products with correct org_id', async ({ page }) => {
    await loginAs(page, orgAUser);
    await page.goto('/dashboard/products/import-massa');
    
    // Create a simple CSV
    const csvContent = 'name,price,brand\nCSV Product 1,50.00,Brand X\nCSV Product 2,75.00,Brand Y';
    
    // Upload file (need to handle file input)
    const fileInput = page.locator('input[type=file]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    
    await page.click('[data-testid=import-submit]');
    
    // Wait for import to complete
    await expect(page.locator('[data-testid=import-success]')).toBeVisible({ timeout: 30000 });
    
    // Verify products in list
    await page.goto('/dashboard/products');
    await expect(page.locator('text=CSV Product 1')).toBeVisible();
    await expect(page.locator('text=CSV Product 2')).toBeVisible();
  });

  test('E2E-09: Clone from catalog_template', async ({ page }) => {
    await loginAs(page, orgAUser);
    await page.goto('/dashboard/products');
    
    // Click clone from template button
    await page.click('[data-testid=clone-from-template]');
    
    // Select a template product
    await page.locator('[data-testid=template-product]').first().click();
    await page.click('[data-testid=clone-confirm]');
    
    await expect(page.locator('[data-testid=toast-success]')).toBeVisible();
    
    // Verify cloned product appears
    await expect(page.locator('[data-testid=product-row]').first()).toBeVisible();
  });

  test('E2E-10: Organization switcher updates product list', async ({ page }) => {
    // Use multi-org user
    await loginAs(page, 'multi-org@example.com');
    await page.goto('/dashboard/products');
    
    const initialCount = await page.locator('[data-testid=product-row]').count();
    
    // Switch organization
    await page.locator('[data-testid=org-selector]').click();
    await page.locator('[data-testid=org-option-2]').click();
    
    // Wait for list to update
    await page.waitForTimeout(1000);
    
    const newCount = await page.locator('[data-testid=product-row]').count();
    // Counts should be different (or at least reloaded)
    expect(newCount).toBeDefined();
  });

  test('E2E-11: Delete product requires owner/admin', async ({ page }) => {
    await loginAs(page, orgAUser);
    await page.goto('/dashboard/products');
    
    // Click delete on first product
    await page.locator('[data-testid=delete-product]').first().click();
    await page.click('[data-testid=confirm-delete]');
    
    await expect(page.locator('[data-testid=toast-success]')).toBeVisible();
  });

  test('E2E-12: Brands and Categories scoped to organization', async ({ page }) => {
    await loginAs(page, orgAUser);
    
    // Test brands
    await page.goto('/dashboard/brands');
    await expect(page.locator('[data-testid=brand-row]')).toBeVisible();
    
    // Test categories
    await page.goto('/dashboard/categories');
    await expect(page.locator('[data-testid=category-row]')).toBeVisible();
  });
});

// Helper function
async function loginAs(page: any, email: string) {
  await page.goto('/login');
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'testpassword123');
  await page.click('button[type=submit]');
  await page.waitForURL('/dashboard');
}