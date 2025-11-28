import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should display login page correctly', async ({ page }) => {
        await page.goto('/login');
        await expect(page.getByRole('heading', { name: 'Coheron ERP' })).toBeVisible();
        await expect(page.getByLabel('Username')).toBeVisible();
        await expect(page.getByLabel('Password')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
        // Mock API login to fail with 400 (Bad Request) instead of 401 to avoid redirect
        await page.route('**/auth/login', route => route.fulfill({
            status: 400,
            body: JSON.stringify({ message: 'Bad Request' })
        }));

        // Mock Odoo auth to fail with network error
        await page.route('**/jsonrpc', route => route.abort());

        await page.goto('/login');
        await page.getByLabel('Username').fill('wronguser');
        await page.getByLabel('Password').fill('wrongpass');
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Check for error div by class name (more reliable than text)
        await expect(page.locator('.auth-error')).toBeVisible({ timeout: 10000 });
    });

    test('should login successfully', async ({ page }) => {
        // Mock API login to succeed
        await page.route('**/auth/login', route => route.fulfill({
            status: 200,
            body: JSON.stringify({ token: 'fake-token', user: { id: 1, name: 'Test User' } })
        }));

        await page.goto('/login');
        await page.getByLabel('Username').fill('testuser');
        await page.getByLabel('Password').fill('password');
        await page.getByRole('button', { name: 'Sign In' }).click();

        // Should navigate to dashboard
        await expect(page).toHaveURL('/dashboard');
    });
});

test.describe('Public Pages', () => {
    test('should load landing page', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL('/');
    });
});
