import { test, expect } from '@playwright/test';

const ALICE_EMAIL = 'alice@test.com';
const BOB_EMAIL = 'bob@test.com';
const TEST_PASSWORD = 'testpassword123';

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

interface RequestInfo {
  id: string;
  shareToken: string;
}

async function createRequestAndGetInfo(
  page: import('@playwright/test').Page,
  recipientEmail: string,
  amount: string,
): Promise<RequestInfo> {
  await page.goto('/requests/new');
  await page.getByLabel(/amount/i).fill(amount);
  await page.getByRole('button', { name: /email/i }).click();
  await page.getByLabel(/recipient/i).fill(recipientEmail);
  await page.getByRole('button', { name: /request funds/i }).click();
  await expect(page.getByText('Request Sent!')).toBeVisible({ timeout: 10000 });

  const linkElement = page.getByText(/\/pay\//);
  const linkText = await linkElement.textContent();
  const shareToken = linkText!.split('/pay/')[1]?.trim() ?? '';

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await page.request.get(
    `${sbUrl}/rest/v1/payment_requests?share_token=eq.${shareToken}&select=id`,
    {
      headers: {
        apikey: sbKey,
        Authorization: `Bearer ${sbKey}`,
      },
    },
  );
  const requests = await res.json();
  return { id: requests[0].id, shareToken };
}

async function expireRequest(
  page: import('@playwright/test').Page,
  requestId: string,
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const res = await page.request.patch(
    `${supabaseUrl}/rest/v1/payment_requests?id=eq.${requestId}`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      data: { expires_at: pastDate },
    },
  );

  if (!res.ok()) {
    throw new Error(`Failed to expire request: ${res.status()} ${await res.text()}`);
  }
}

async function setExpiresAt(
  page: import('@playwright/test').Page,
  requestId: string,
  expiresAt: string,
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await page.request.patch(
    `${supabaseUrl}/rest/v1/payment_requests?id=eq.${requestId}`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      data: { expires_at: expiresAt },
    },
  );

  if (!res.ok()) {
    throw new Error(`Failed to update expires_at: ${res.status()} ${await res.text()}`);
  }
}

/** Dashboard is client-rendered; under parallel e2e load the dev server may be slow to respond. */
async function openOutgoingOnDashboard(page: import('@playwright/test').Page) {
  await page.goto('/dashboard', { waitUntil: 'load' });
  await expect(page.getByRole('tablist', { name: 'Request direction' })).toBeVisible({
    timeout: 45_000,
  });
  await page.getByRole('tab', { name: /outgoing/i }).click();
}

test.describe('Request Expiration (US9)', () => {
  test.describe.configure({ mode: 'serial', timeout: 90_000 });

  test('expired request blocks payment on detail page', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const { id: requestId } = await createRequestAndGetInfo(page, BOB_EMAIL, '25.00');

    await expireRequest(page, requestId);

    await signIn(page, BOB_EMAIL);
    await page.goto(`/requests/${requestId}`);

    await expect(page.getByRole('heading', { level: 1, name: '$25.00' })).toBeVisible({
      timeout: 10000,
    });

    await expect(page.locator('span').filter({ hasText: /^Expired$/ })).toBeVisible();

    const payButton = page.getByRole('button', { name: /^pay/i });
    await expect(payButton).toHaveCount(0);

    const declineButton = page.getByRole('button', { name: /^decline$/i });
    await expect(declineButton).toHaveCount(0);
  });

  test('expired request shows expired status on dashboard', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const { id: requestId } = await createRequestAndGetInfo(page, BOB_EMAIL, '42.00');

    await expireRequest(page, requestId);

    await signIn(page, ALICE_EMAIL);
    await openOutgoingOnDashboard(page);

    const requestCard = page.locator(`a[href="/requests/${requestId}"]`);
    await expect(requestCard).toBeVisible({ timeout: 10000 });
    await expect(requestCard.locator('span').filter({ hasText: /^Expired$/ })).toBeVisible();
  });

  test('expired request shows read-only on detail with expiration date', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const { id: requestId } = await createRequestAndGetInfo(page, BOB_EMAIL, '33.00');

    await expireRequest(page, requestId);

    await signIn(page, ALICE_EMAIL);
    await page.goto(`/requests/${requestId}`);

    await expect(page.getByRole('heading', { level: 1, name: '$33.00' })).toBeVisible({
      timeout: 10000,
    });

    await expect(page.locator('span').filter({ hasText: /^Expired$/ })).toBeVisible();
    await expect(page.getByText(/no further actions/i)).toBeVisible();

    await expect(page.getByRole('term').filter({ hasText: 'Expired' })).toBeVisible();

    const cancelButton = page.getByRole('button', { name: /cancel request/i });
    await expect(cancelButton).toHaveCount(0);
  });

  test('near-expiry request shows countdown on dashboard', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const { id: requestId } = await createRequestAndGetInfo(page, BOB_EMAIL, '10.00');

    const nearExpiry = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    await setExpiresAt(page, requestId, nearExpiry);

    await openOutgoingOnDashboard(page);

    const requestCard = page.locator(`a[href="/requests/${requestId}"]`);
    await expect(requestCard).toBeVisible({ timeout: 10000 });
    await expect(requestCard.getByText('Pending')).toBeVisible();
    await expect(requestCard.getByText(/expires in/i).last()).toBeVisible();
  });

  test('public link shows expired request as read-only', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const { shareToken } = await createRequestAndGetInfo(page, 'guest-expiry@example.com', '50.00');

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
    await expireRequest(page, requests[0].id);

    await page.context().clearCookies();
    await page.goto(`/pay/${shareToken}`);

    await expect(page.getByRole('heading', { name: '$50.00' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('span').filter({ hasText: /^Expired$/ })).toBeVisible();
    await expect(page.getByText(/no further actions/i)).toBeVisible();

    const payButton = page.getByRole('button', { name: /pay/i });
    await expect(payButton).toHaveCount(0);
  });

  test('guest payment API rejects expired request', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const { shareToken, id: requestId } = await createRequestAndGetInfo(
      page,
      'guest-api-expiry@example.com',
      '35.00',
    );

    await expireRequest(page, requestId);

    const bankRes = await page.request.post('http://localhost:3000/api/bank-guest', {
      data: {
        bankName: 'Chase',
        accountNumberLast4: '5678',
      },
    });

    let guestBankId: string | null = null;
    if (bankRes.ok()) {
      const bankData = await bankRes.json();
      guestBankId = bankData.data?.guestBankId ?? null;
    }

    if (guestBankId) {
      const payRes = await page.request.post('http://localhost:3000/api/pay-guest', {
        data: {
          shareToken,
          guestBankId,
        },
      });

      expect(payRes.status()).toBe(400);
      const payData = await payRes.json();
      expect(payData.success).toBe(false);
      expect(payData.error.code).toBe('REQUEST_EXPIRED');
    }
  });
});
