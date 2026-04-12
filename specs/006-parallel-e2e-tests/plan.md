# Implementation Plan: Parallel E2E Test Organization

**Branch**: `006-parallel-e2e-tests` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/006-parallel-e2e-tests/spec.md`

## Summary

Reorganize the Playwright e2e suite into two groups — a parallel-safe group (7 files) and a serial-financial group (3 files) — so that read-only and request-lifecycle tests run concurrently with multiple workers, while tests that mutate wallet/bank balances or temporarily delete account records run one at a time. The change requires updating `playwright.config.ts`, two new npm scripts, and adding missing `mode: 'serial'` annotations to two test files.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: `@playwright/test ^1.59.1`, `dotenv`  
**Storage**: Supabase Postgres (hosted) — `wallets`, `bank_accounts`, `payment_requests`, `users`  
**Testing**: Playwright (e2e), Vitest (unit)  
**Target Platform**: Next.js 15 web app on localhost:3000  
**Performance Goals**: Parallel group completes in <60% of current full-suite wall-clock time  
**Constraints**: CI runners have 2 vCPUs — cap CI workers at 2; no new database migrations  
**Scale/Scope**: 10 test files, ~50 individual tests; zero new test logic added

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Financial Integrity | ✅ PASS | Serial group ensures no concurrent balance mutations |
| II. Atomic and Fail-Safe Operations | ✅ PASS | No changes to application code; DB atomicity unchanged |
| III. Auditability | ✅ PASS | Not affected by test infrastructure changes |
| IV. Backend-Enforced Validation | ✅ PASS | Not affected |
| V. User Experience Quality | ✅ PASS | Not affected |
| VI. Testing Discipline | ✅ PASS | Determinism is preserved: serial group prevents flaky financial tests; parallel group is isolated |
| VII. Simplicity and Maintainability | ✅ PASS | Single config file, two projects, two npm scripts — minimal added complexity |
| VIII. Documentation and AI Discipline | ✅ PASS | Assumptions documented in research.md |

**Post-design re-check**: All gates pass. The design is additive (no test logic changes, no DB changes) and directly strengthens Principle VI (determinism).

## Project Structure

### Documentation (this feature)

```text
specs/006-parallel-e2e-tests/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: Playwright parallelism + data isolation analysis
├── data-model.md        # Phase 1: Test group classification + config changes
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
playwright.config.ts          # Updated: two projects, workers, fullyParallel per project
package.json                  # Updated: test:e2e, test:e2e:parallel, test:e2e:serial scripts
.github/workflows/ci.yml      # Updated if test:e2e script behavior changes
tests/e2e/
├── pay-with-wallet.spec.ts   # Updated: add mode: 'serial' annotation
├── pay-with-bank.spec.ts     # Updated: add mode: 'serial' annotation
└── (all other files unchanged)
```

**Structure Decision**: Single project structure (Option 1). All changes are in existing files. No new files required.

## Complexity Tracking

> No constitution violations. Table not applicable.

---

## Implementation Details

### 1. `playwright.config.ts` — Two Projects

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: 'html',
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
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Key decisions**:
- `workers` is global (default for both projects). Serial-financial script overrides with `--workers=1`.
- `fullyParallel: true` on `parallel` project: tests across files AND within files may run concurrently.
- `fullyParallel: false` on `serial-financial`: tests within a file run in order (but `--workers=1` on the npm script is the primary guard against cross-file parallelism).
- `globalSetup` runs once per `playwright test` invocation (i.e., once for the parallel script run, once for the serial script run). This resets seed data twice, which is correct and desired.

### 2. `package.json` — New Scripts

```json
"test:e2e": "playwright test --project=parallel && playwright test --project=serial-financial --workers=1",
"test:e2e:parallel": "playwright test --project=parallel",
"test:e2e:serial": "playwright test --project=serial-financial --workers=1",
```

**Why `&&`**: Parallel group must complete (and pass) before serial financial group starts. This preserves the invariant that financial tests observe clean initial seed state.

### 3. `pay-with-wallet.spec.ts` — Add `mode: 'serial'`

```typescript
test.describe('Pay with Wallet (US2)', () => {
  test.describe.configure({ mode: 'serial' });
  // ... existing tests
});
```

**Why**: Without this, if the serial-financial project somehow runs with workers > 1 (e.g., developer runs `npx playwright test --project=serial-financial` without `--workers=1`), the three wallet tests would run in parallel and Bob's $50 balance could be unexpectedly low for the second test.

### 4. `pay-with-bank.spec.ts` — Add `mode: 'serial'`

```typescript
test.describe('Pay with Bank Account (US2)', () => {
  test.describe.configure({ mode: 'serial' });
  // ... existing tests
});
```

**Why**: Same defensive reason as above. Consistent with all other financial mutation test files.

### 5. `.github/workflows/ci.yml` — No Change Required

The existing step `npm run test:e2e` will automatically use the updated script. The artifact upload steps are unchanged. No CI YAML edits needed.

---

## Trade-offs and Assumptions

1. **Global setup runs twice**: When `test:e2e` runs both projects, global-setup executes twice (once per `playwright test` invocation). This resets seed data to known state before each group. Cost: ~2-3 extra seconds. Benefit: serial financial tests always start with predictable balances.

2. **`dashboard-balance.spec.ts` in the parallel group**: This test reads Alice's bank account display. If `public-payment.spec.ts` runs concurrently and increments Alice's wallet, the dashboard-balance test only checks format (regex `\$[\d,]+\.\d{2}`), not specific value — so no conflict.

3. **`public-payment.spec.ts` in the parallel group**: It credits Alice's wallet, but only via additions. Concurrent additions to the same wallet row are atomic in Postgres (no lost updates). The test itself only checks for UI confirmation, not the resulting balance value.

4. **`wallet-topup.spec.ts` conflict with `dashboard-balance.spec.ts`**: This is the primary motivation for project separation. Wallet-topup test 3 temporarily deletes Alice's bank account. By placing wallet-topup in `serial-financial` (which runs AFTER `parallel` completes), there is zero overlap window.
