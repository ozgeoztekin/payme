import { test, expect } from '@playwright/test';

const ALICE_EMAIL = 'alice@test.com';
const TEST_PASSWORD = 'testpassword123';
const ALICE_ID = '11111111-1111-1111-1111-111111111111';

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ALICE_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/);
}

async function setAlicePhone(page: import('@playwright/test').Page, phone: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await page.request.patch(`${supabaseUrl}/rest/v1/users?id=eq.${ALICE_ID}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    data: { phone },
  });
}

test.describe('Profile (US1–US4)', () => {
  test.describe.configure({ mode: 'serial' });

  test('displays display name, email read-only on profile page', async ({ page }) => {
    await setAlicePhone(page, null);
    await signIn(page);
    await page.goto('/profile');

    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Profile' })).toBeVisible();
    await expect(main.getByText('Account Information')).toBeVisible();
    await expect(main.getByText('Name')).toBeVisible();
    await expect(main.getByText('Alice', { exact: true })).toBeVisible();
    await expect(main.getByText(ALICE_EMAIL)).toBeVisible();

    const emailInputs = main.locator(`input[value="${ALICE_EMAIL}"]`);
    await expect(emailInputs).toHaveCount(0);
  });

  test('displays display name in sidebar on all pages', async ({ page }) => {
    await signIn(page);
    await page.goto('/requests/new');

    const sidebar = page.locator('aside');
    await expect(sidebar.getByText('Alice')).toBeVisible();
  });

  test('displays existing phone number read-only', async ({ page }) => {
    const testPhone = '+15551112222';
    await setAlicePhone(page, testPhone);
    await signIn(page);
    await page.goto('/profile');

    await expect(page.getByText(testPhone)).toBeVisible();

    const phoneInputs = page.locator(`input[value="${testPhone}"]`);
    await expect(phoneInputs).toHaveCount(0);

    await expect(page.getByRole('heading', { name: 'Add Phone Number' })).not.toBeVisible();
  });

  test('active user adds phone number successfully', async ({ page }) => {
    const newPhone = '+15559998888';
    await setAlicePhone(page, null);
    await signIn(page);
    await page.goto('/profile');

    await expect(page.getByText(/no phone number added/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Phone Number' })).toBeVisible();

    await page.getByLabel(/phone number/i).fill(newPhone);
    await page.getByRole('button', { name: /save phone number/i }).click();

    await expect(page.getByText(/phone number added successfully/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(newPhone)).toBeVisible();

    await setAlicePhone(page, null);
  });

  test('shows validation error for invalid phone format', async ({ page }) => {
    await setAlicePhone(page, null);
    await signIn(page);
    await page.goto('/profile');

    await page.getByLabel(/phone number/i).fill('1234');
    await page.getByRole('button', { name: /save phone number/i }).click();

    await expect(page.getByText(/E\.164 format/i)).toBeVisible({ timeout: 5000 });
  });

  test('logout redirects to login page', async ({ page }) => {
    await signIn(page);
    await page.goto('/profile');

    await page.getByRole('button', { name: /log out/i }).click();

    await expect(page.getByRole('heading', { name: /log out/i })).toBeVisible();
    await page
      .getByRole('button', { name: /log out/i })
      .last()
      .click();

    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user is redirected to login from /profile', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForURL(/\/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
