import { test, expect } from '@playwright/test';

const ALICE_EMAIL = 'alice@test.com';
const BOB_EMAIL = 'bob@test.com';
const TEST_PASSWORD = 'testpassword123';

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

async function createRequestAndGetId(
  page: import('@playwright/test').Page,
  recipientEmail: string,
  amount: string,
): Promise<string> {
  await page.goto('/requests/new');
  await page.getByLabel(/amount/i).fill(amount);
  await page.getByRole('button', { name: /email/i }).click();
  await page.getByLabel(/recipient/i).fill(recipientEmail);
  await page.getByRole('button', { name: /request funds/i }).click();
  await expect(page.getByText('Request Sent!')).toBeVisible({ timeout: 10000 });

  const linkElement = page.getByText(/\/pay\//);
  const linkText = await linkElement.textContent();
  const shareToken = linkText!.split('/pay/')[1]?.trim();

  await page.context().clearCookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await page.request.get(
    `${supabaseUrl}/rest/v1/payment_requests?share_token=eq.${shareToken}&select=id`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  const requests = await res.json();
  return requests[0].id;
}

test.describe('Pay with Bank Account (US2)', () => {
  test('pays a pending request with bank account', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const requestId = await createRequestAndGetId(page, BOB_EMAIL, '15.00');

    await signIn(page, BOB_EMAIL);
    await page.goto(`/requests/${requestId}`);

    await expect(
      page.getByRole('heading', { level: 1, name: '$15.00' }),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /test bank/i }).click();
    await page.getByRole('button', { name: /pay \$15\.00/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /pay \$15\.00/i })
      .click();

    await expect(page.getByText(/payment successful/i)).toBeVisible({ timeout: 15000 });
  });

  test('allows bank payment when wallet has insufficient balance', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const requestId = await createRequestAndGetId(page, BOB_EMAIL, '99.00');

    await signIn(page, BOB_EMAIL);
    await page.goto(`/requests/${requestId}`);

    await expect(
      page.getByRole('heading', { level: 1, name: '$99.00' }),
    ).toBeVisible({ timeout: 10000 });

    const walletOption = page.getByRole('button', { name: /wallet/i });
    await expect(walletOption).toBeDisabled();

    const bankOption = page.getByRole('button', { name: /test bank/i });
    await expect(bankOption).toBeEnabled();

    await bankOption.click();
    await page.getByRole('button', { name: /pay \$99\.00/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /pay \$99\.00/i })
      .click();

    await expect(page.getByText(/payment successful/i)).toBeVisible({ timeout: 15000 });
  });
});
