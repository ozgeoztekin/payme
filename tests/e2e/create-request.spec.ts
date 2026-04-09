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

test.describe('Create Payment Request (US1)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/requests/new');
    await expect(page.getByRole('heading', { name: 'Request Funds' })).toBeVisible();
  });

  test('creates a request with email recipient', async ({ page }) => {
    await page.getByLabel(/amount/i).fill('50.00');
    await page.getByRole('button', { name: /email/i }).click();
    await page.getByLabel(/recipient/i).fill('bob@test.com');
    await page.getByPlaceholder(/add a short note/i).fill('Dinner split');
    await page.getByRole('button', { name: /request funds/i }).click();

    await expect(page.getByText('Request Sent!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('bob@test.com')).toBeVisible();
    await expect(page.getByText('$50.00')).toBeVisible();
    await expect(page.getByText(/shareable link/i)).toBeVisible();
  });

  test('creates a request with phone recipient', async ({ page }) => {
    await page.getByLabel(/amount/i).fill('25.00');
    await page.getByRole('button', { name: /phone/i }).click();
    await page.getByLabel(/recipient/i).fill('+15559876543');
    await page.getByRole('button', { name: /request funds/i }).click();

    await expect(page.getByText('Request Sent!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('+15559876543')).toBeVisible();
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.getByLabel(/amount/i).fill('10.00');
    await page.getByRole('button', { name: /email/i }).click();
    await page.getByLabel(/recipient/i).fill('not-an-email');
    await page.getByRole('button', { name: /request funds/i }).click();

    await expect(page.getByText(/invalid email/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows validation error for zero amount', async ({ page }) => {
    await page.getByLabel(/amount/i).fill('0');
    await page.getByRole('button', { name: /email/i }).click();
    await page.getByLabel(/recipient/i).fill('bob@test.com');
    await page.getByRole('button', { name: /request funds/i }).click();

    await expect(page.getByText(/minimum amount/i)).toBeVisible({ timeout: 5000 });
  });

  test('rejects self-request by email', async ({ page }) => {
    await page.getByLabel(/amount/i).fill('10.00');
    await page.getByRole('button', { name: /email/i }).click();
    await page.getByLabel(/recipient/i).fill(TEST_EMAIL);
    await page.getByRole('button', { name: /request funds/i }).click();

    await expect(
      page.getByText(/cannot request money from yourself/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('generates a shareable link that can be copied', async ({ page }) => {
    await page.getByLabel(/amount/i).fill('100.00');
    await page.getByRole('button', { name: /email/i }).click();
    await page.getByLabel(/recipient/i).fill('bob@test.com');
    await page.getByRole('button', { name: /request funds/i }).click();

    await expect(page.getByText('Request Sent!')).toBeVisible({ timeout: 10000 });

    const linkElement = page.getByText(/\/pay\//);
    await expect(linkElement).toBeVisible();
    const linkText = await linkElement.textContent();
    expect(linkText).toContain('/pay/');

    await page.getByRole('button', { name: /copy/i }).click();
    await expect(page.getByText(/copied/i)).toBeVisible();
  });

  test('allows creating another request after success', async ({ page }) => {
    await page.getByLabel(/amount/i).fill('5.00');
    await page.getByRole('button', { name: /email/i }).click();
    await page.getByLabel(/recipient/i).fill('bob@test.com');
    await page.getByRole('button', { name: /request funds/i }).click();

    await expect(page.getByText('Request Sent!')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /create another/i }).click();
    await expect(page.getByRole('heading', { name: 'Request Funds' })).toBeVisible();
  });
});
