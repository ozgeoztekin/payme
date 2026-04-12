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

test.describe('Wallet Top-Up (US6)', () => {
  test.describe.configure({ mode: 'serial' });

  test('successfully tops up wallet from connected bank', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    await page.goto('/wallet');

    await expect(page.getByRole('heading', { level: 1, name: 'Wallet' })).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByText('Wallet Balance')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Top Up' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: '$25.00' }).click();

    const amountInput = page.getByLabel(/amount/i);
    await expect(amountInput).toHaveValue('25.00');

    await page.getByRole('button', { name: 'Top Up Wallet' }).click();

    await expect(page.getByText(/added to your wallet/i)).toBeVisible({ timeout: 15000 });
  });

  test('shows insufficient bank balance when amount exceeds bank balance', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    await page.goto('/wallet');

    await expect(page.getByRole('heading', { name: 'Top Up' })).toBeVisible({
      timeout: 10000,
    });

    const amountInput = page.getByLabel(/amount/i);
    await amountInput.fill('999999.00');

    await page.getByRole('button', { name: 'Top Up Wallet' }).click();

    await expect(page.getByText(/exceeds your bank account balance|insufficient/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('shows guidance when no bank account is connected', async ({ page }) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const aliceId = '11111111-1111-1111-1111-111111111111';

    await signIn(page, ALICE_EMAIL);

    await page.request.delete(
      `${supabaseUrl}/rest/v1/bank_accounts?user_id=eq.${aliceId}&is_guest=eq.false`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: 'return=minimal',
        },
      },
    );

    try {
      await page.goto('/wallet');

      await expect(page.getByRole('heading', { name: /connect a bank account/i })).toBeVisible({
        timeout: 10000,
      });
      await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
    } finally {
      await page.request.post(`${supabaseUrl}/rest/v1/bank_accounts`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        data: {
          id: 'd1111111-1111-1111-1111-111111111111',
          user_id: aliceId,
          bank_name: 'Test Bank',
          account_number_masked: '••••1001',
          balance_minor: 1000000,
          currency: 'USD',
          is_guest: false,
        },
      });
    }
  });
});
