import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const reporters: ReporterDescription[] = [['list'], ['html', { open: 'never' }]];
if (process.env.CI) {
  reporters.push(['github']);
}

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: reporters,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'on',
  },
  projects: [
    {
      name: 'parallel',
      fullyParallel: true,
      testMatch: [
        '**/dashboard-balance.spec.ts',
        '**/dashboard-empty-state.spec.ts',
        '**/create-request.spec.ts',
        '**/decline-cancel.spec.ts',
        '**/expiration.spec.ts',
        '**/profile.spec.ts',
        '**/public-payment.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'serial-financial',
      fullyParallel: false,
      testMatch: [
        '**/pay-with-wallet.spec.ts',
        '**/pay-with-bank.spec.ts',
        '**/wallet-topup.spec.ts',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Webpack dev server avoids Turbopack RSC manifest races when many workers hit the app at once.
  webServer: {
    command: 'npm run dev:e2e',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
