import { test, expect } from '@playwright/test';

const ALICE_EMAIL = 'alice@test.com';
const TEST_PASSWORD = 'testpassword123';

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

async function createRequestAndGetShareUrl(
  page: import('@playwright/test').Page,
  recipientEmail: string,
  amount: string,
): Promise<string> {
  await page.goto('/requests/new');
  await page.getByLabel(/amount/i).fill(amount);
  await page.getByRole('button', { name: /email/i }).click();
  await page.getByLabel(/recipient/i).fill(recipientEmail);
  await page.getByRole('button', { name: /request funds/i }).click();
  await expect(page.getByText('Request Sent!')).toBeVisible({ timeout: 20000 });

  const linkElement = page.getByText(/\/pay\//);
  const linkText = await linkElement.textContent();
  const shareUrl = linkText!.trim();

  return shareUrl;
}

function toPayPath(shareUrl: string): string {
  return shareUrl.includes('/pay/') ? `/pay/${shareUrl.split('/pay/')[1]}` : shareUrl;
}

test.describe('Public Payment (US7)', () => {
  test('guest views a pending request and pays via bank', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const shareUrl = await createRequestAndGetShareUrl(page, 'guest@example.com', '15.00');

    await page.context().clearCookies();
    await page.goto(toPayPath(shareUrl));

    await expect(page.getByRole('heading', { name: '$15.00' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pending')).toBeVisible();
    await expect(page.getByText('guest@example.com')).toBeVisible();

    await expect(page.getByText(/respond to this request/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /pay \$15\.00/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /decline/i })).toBeVisible();

    await page.getByRole('button', { name: /pay \$15\.00/i }).click();

    await expect(page.getByRole('heading', { name: /connect a bank account/i })).toBeVisible({
      timeout: 5000,
    });

    await page.getByLabel(/bank$/i).selectOption('Chase');
    await page.getByLabel(/last 4 digits/i).fill('9876');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/confirm bank connection/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Chase')).toBeVisible();
    await expect(page.getByText('••••9876')).toBeVisible();

    await page.getByRole('button', { name: /connect.*continue/i }).click();

    await expect(page.getByText(/confirm payment/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: '$15.00' })).toBeVisible();

    await page.getByRole('button', { name: /pay \$15\.00/i }).click();

    await expect(page.getByText(/payment successful/i)).toBeVisible({ timeout: 15000 });
  });

  test('guest declines a pending request', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const shareUrl = await createRequestAndGetShareUrl(page, 'guest-decline@example.com', '20.00');

    await page.context().clearCookies();
    await page.goto(toPayPath(shareUrl));

    await expect(page.getByRole('heading', { name: '$20.00' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/respond to this request/i)).toBeVisible();

    await page.getByRole('button', { name: /decline/i }).click();

    await expect(page.getByText(/request declined/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(new RegExp(`declined the payment request`, 'i'))).toBeVisible();
  });

  test('guest views a terminal (paid) request as read-only', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const shareUrl = await createRequestAndGetShareUrl(page, 'guest-readonly@example.com', '5.00');

    await page.context().clearCookies();
    await page.goto(toPayPath(shareUrl));

    await expect(page.getByRole('heading', { name: '$5.00' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/respond to this request/i)).toBeVisible();

    await page.getByRole('button', { name: /pay \$5\.00/i }).click();
    await page.getByLabel(/bank$/i).selectOption('Wells Fargo');
    await page.getByLabel(/last 4 digits/i).fill('4321');
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /connect.*continue/i }).click();
    await page.getByRole('button', { name: /pay \$5\.00/i }).click();
    await expect(page.getByText(/payment successful/i)).toBeVisible({ timeout: 15000 });

    await page.goto(toPayPath(shareUrl));
    await expect(page.getByRole('heading', { name: '$5.00' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Paid', { exact: true })).toBeVisible();

    await expect(page.getByText(/respond to this request/i)).not.toBeVisible();
    await expect(page.getByText(/no further actions/i)).toBeVisible();
  });

  test('shows 404 for invalid share token', async ({ page }) => {
    await page.goto('/pay/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/not found/i)).toBeVisible({ timeout: 10000 });
  });
});
