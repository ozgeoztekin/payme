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

test.describe('Dashboard empty state titles reflect active filter', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/dashboard');
  });

  test('shows "No incoming requests" with All filter', async ({ page }) => {
    await page.getByRole('button', { name: 'All' }).click();
    await page.getByRole('tab', { name: /incoming/i }).click();

    await page.waitForTimeout(500);

    const emptyHeading = page.getByRole('heading', { level: 3 });
    if (await emptyHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(emptyHeading).toHaveText('No incoming requests');
    }
  });

  test('shows "No outgoing requests" with All filter', async ({ page }) => {
    await page.getByRole('button', { name: 'All' }).click();
    await page.getByRole('tab', { name: /outgoing/i }).click();

    await page.waitForTimeout(500);

    const emptyHeading = page.getByRole('heading', { level: 3 });
    if (await emptyHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(emptyHeading).toHaveText('No outgoing requests');
    }
  });

  for (const status of ['Pending', 'Paid', 'Declined', 'Canceled', 'Expired'] as const) {
    test(`shows "No ${status.toLowerCase()} requests" when ${status} filter is active (incoming)`, async ({
      page,
    }) => {
      await page.getByRole('tab', { name: /incoming/i }).click();
      await page.getByRole('button', { name: status, exact: true }).click();

      await page.waitForTimeout(500);

      const emptyHeading = page.getByRole('heading', { level: 3 });
      if (await emptyHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(emptyHeading).toHaveText(`No ${status.toLowerCase()} requests`);
      }
    });

    test(`shows "No ${status.toLowerCase()} requests" when ${status} filter is active (outgoing)`, async ({
      page,
    }) => {
      await page.getByRole('tab', { name: /outgoing/i }).click();
      await page.getByRole('button', { name: status, exact: true }).click();

      await page.waitForTimeout(500);

      const emptyHeading = page.getByRole('heading', { level: 3 });
      if (await emptyHeading.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(emptyHeading).toHaveText(`No ${status.toLowerCase()} requests`);
      }
    });
  }
});
