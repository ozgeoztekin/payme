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

test.describe('Decline and Cancel Requests (US8)', () => {
  test.describe.configure({ mode: 'serial' });

  test('recipient declines a pending request', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const requestId = await createRequestAndGetId(page, BOB_EMAIL, '20.00');

    await signIn(page, BOB_EMAIL);
    await page.goto(`/requests/${requestId}`);

    await expect(page.getByRole('heading', { level: 1, name: '$20.00' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Pending')).toBeVisible();

    await page.getByRole('button', { name: /decline/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/are you sure you want to decline/i)).toBeVisible();

    await page
      .getByRole('dialog')
      .getByRole('button', { name: /decline/i })
      .click();

    await expect(page.getByText(/request declined/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('$20.00')).toBeVisible();
  });

  test('requester cancels their own pending request', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const requestId = await createRequestAndGetId(page, BOB_EMAIL, '30.00');

    await signIn(page, ALICE_EMAIL);
    await page.goto(`/requests/${requestId}`);

    await expect(page.getByRole('heading', { level: 1, name: '$30.00' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: /cancel request/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/are you sure you want to cancel/i)).toBeVisible();

    await page
      .getByRole('dialog')
      .getByRole('button', { name: /cancel request/i })
      .click();

    await expect(page.getByText(/request canceled/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('$30.00')).toBeVisible();
  });

  test('requester cannot decline their own request', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const requestId = await createRequestAndGetId(page, BOB_EMAIL, '12.00');

    await signIn(page, ALICE_EMAIL);
    await page.goto(`/requests/${requestId}`);

    await expect(page.getByRole('heading', { level: 1, name: '$12.00' })).toBeVisible({
      timeout: 10000,
    });

    const declineButton = page.getByRole('button', { name: /^decline$/i });
    await expect(declineButton).toHaveCount(0);
  });

  test('recipient cannot cancel a request they received', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const requestId = await createRequestAndGetId(page, BOB_EMAIL, '18.00');

    await signIn(page, BOB_EMAIL);
    await page.goto(`/requests/${requestId}`);

    await expect(page.getByRole('heading', { level: 1, name: '$18.00' })).toBeVisible({
      timeout: 10000,
    });

    const cancelButton = page.getByRole('button', { name: /cancel request/i });
    await expect(cancelButton).toHaveCount(0);
  });

  test('cannot decline an already-declined request', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const requestId = await createRequestAndGetId(page, BOB_EMAIL, '8.00');

    // Bob declines the request
    await signIn(page, BOB_EMAIL);
    await page.goto(`/requests/${requestId}`);
    await expect(page.getByRole('heading', { level: 1, name: '$8.00' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: /decline/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /decline/i })
      .click();
    await expect(page.getByText(/request declined/i)).toBeVisible({ timeout: 15000 });

    // Navigate back to the request — should be read-only
    await page.goto(`/requests/${requestId}`);
    await expect(page.getByRole('heading', { level: 1, name: '$8.00' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Declined', { exact: true })).toBeVisible();

    const declineButton = page.getByRole('button', { name: /^decline$/i });
    await expect(declineButton).toHaveCount(0);
    const payButton = page.getByRole('button', { name: /^pay/i });
    await expect(payButton).toHaveCount(0);
  });

  test('cannot cancel an already-canceled request', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const requestId = await createRequestAndGetId(page, BOB_EMAIL, '7.00');

    // Alice cancels her own request
    await signIn(page, ALICE_EMAIL);
    await page.goto(`/requests/${requestId}`);
    await expect(page.getByRole('heading', { level: 1, name: '$7.00' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: /cancel request/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /cancel request/i })
      .click();
    await expect(page.getByText(/request canceled/i)).toBeVisible({ timeout: 15000 });

    // Navigate back — should be read-only
    await page.goto(`/requests/${requestId}`);
    await expect(page.getByRole('heading', { level: 1, name: '$7.00' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Canceled', { exact: true })).toBeVisible();

    const cancelButton = page.getByRole('button', { name: /cancel request/i });
    await expect(cancelButton).toHaveCount(0);
  });

  test('decline confirmation modal can be dismissed', async ({ page }) => {
    await signIn(page, ALICE_EMAIL);
    const requestId = await createRequestAndGetId(page, BOB_EMAIL, '14.00');

    await signIn(page, BOB_EMAIL);
    await page.goto(`/requests/${requestId}`);
    await expect(page.getByRole('heading', { level: 1, name: '$14.00' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: /decline/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });

    await page.getByRole('dialog').getByRole('button', { name: /keep/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await expect(page.getByText('Pending')).toBeVisible();
  });
});
