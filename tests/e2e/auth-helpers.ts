import { expect, type Page } from '@playwright/test';

const DEFAULT_PASSWORD = 'testpassword123';

/**
 * Wait until the authenticated chrome shows a visible Dashboard link.
 * Scopes to visible <nav> so we don't pick the desktop sidebar link while it is `hidden md:flex`.
 */
async function expectVisibleDashboardNav(page: Page): Promise<void> {
  const navs = page.locator('nav');
  const n = await navs.count();
  expect(n).toBeGreaterThan(0);

  let found = false;
  for (let i = 0; i < n; i += 1) {
    const nav = navs.nth(i);
    if (!(await nav.isVisible())) continue;

    const dash = nav.getByRole('link', { name: 'Dashboard' });
    const linkCount = await dash.count();
    for (let j = 0; j < linkCount; j += 1) {
      if (await dash.nth(j).isVisible()) {
        found = true;
        break;
      }
    }
    if (found) break;
  }
  expect(found).toBe(true);
}

/**
 * Signs in via /login and waits until the authenticated shell is ready.
 *
 * Do not use a standalone waitForURL('/dashboard'): the client can update the URL before
 * Supabase session cookies are committed, so the auth layout may redirect back to /login
 * and leave tests with a false-positive URL and zero nav links.
 */
export async function signInAs(
  page: Page,
  email: string,
  options?: { password?: string; clearCookiesFirst?: boolean },
): Promise<void> {
  const password = options?.password ?? DEFAULT_PASSWORD;
  if (options?.clearCookiesFirst) {
    await page.context().clearCookies();
  }

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  await expect(async () => {
    await expectVisibleDashboardNav(page);
  }).toPass({ timeout: 30_000 });
}
