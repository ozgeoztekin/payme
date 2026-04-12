import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'alice@test.com';
const TEST_PASSWORD = 'testpassword123';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe('Dashboard wallet balance and bank account', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard');
  });

  test('displays "Total Available Balance" label', async ({ page }) => {
    await expect(page.getByText('Total Available Balance')).toBeVisible({ timeout: 10000 });
  });

  test('displays a formatted dollar amount for the balance', async ({ page }) => {
    const balanceSection = page.getByLabel('Account summary');
    await expect(balanceSection).toBeVisible({ timeout: 10000 });
    await expect(balanceSection.locator('text=/\\$[\\d,]+\\.\\d{2}/')).toBeVisible();
  });

  test('displays connected bank card with "Primary Bank" label', async ({ page }) => {
    await expect(page.getByText('Primary Bank')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Connected')).toBeVisible();
  });

  test('bank card links to wallet page', async ({ page }) => {
    await expect(page.getByText('Primary Bank')).toBeVisible({ timeout: 10000 });
    const bankLink = page.locator('a[href="/wallet"]', { hasText: 'Primary Bank' });
    await bankLink.click();
    await page.waitForURL(/\/wallet/);
  });
});
