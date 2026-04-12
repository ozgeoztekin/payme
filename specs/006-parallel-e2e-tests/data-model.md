# Data Model: Parallel E2E Test Organization

No new database tables or schema changes are required for this feature. The changes are entirely in test infrastructure configuration.

## Test Group Classification (logical model)

### Group: `parallel`

Tests in this group are safe to run concurrently because they either:
- Read data only, OR
- Write to `payment_requests` rows that are unique per test (no shared row contention), OR
- Write to isolated user fields (e.g., `users.phone`) that other parallel tests do not read

| File | Tables Written | Tables Read |
|------|---------------|-------------|
| `dashboard-balance.spec.ts` | — | `wallets`, `bank_accounts` |
| `dashboard-empty-state.spec.ts` | — | `payment_requests` |
| `create-request.spec.ts` | `payment_requests` | `payment_requests` |
| `decline-cancel.spec.ts` | `payment_requests` | `payment_requests` |
| `expiration.spec.ts` | `payment_requests` | `payment_requests` |
| `profile.spec.ts` | `users.phone` | `users` |
| `public-payment.spec.ts` | `payment_requests`, `wallets` (Alice, credit-only) | `payment_requests`, `bank_accounts` |

### Group: `serial-financial`

Tests in this group mutate wallet balances or bank account existence. They must run with `--workers=1` to avoid race conditions or temporary-state conflicts.

| File | Tables Written | Specific Risk |
|------|---------------|---------------|
| `pay-with-wallet.spec.ts` | `wallets` (Bob debit), `payment_requests` | Concurrent debit of same wallet row |
| `pay-with-bank.spec.ts` | `bank_accounts` (Bob debit), `wallets` (Alice credit), `payment_requests` | Row-level lock contention on financial tables |
| `wallet-topup.spec.ts` | `wallets` (Alice credit), `bank_accounts` (Alice: DELETE + INSERT in test 3) | Temporary absence of Alice's bank row conflicts with any concurrent test reading it |

## State Transitions

No new state machines. Existing payment request lifecycle (Pending → Paid/Declined/Canceled/Expired) is unchanged.

## Configuration Changes (logical)

### `playwright.config.ts` changes

| Setting | Current | New |
|---------|---------|-----|
| `workers` | `1` (global) | `process.env.CI ? 2 : 4` (global default) |
| `fullyParallel` | `true` (global) | `true` per `parallel` project only |
| Projects | `[{ name: 'chromium' }]` | `[{ name: 'parallel', ... }, { name: 'serial-financial', ... }]` |

### `package.json` script changes

| Script | Current | New |
|--------|---------|-----|
| `test:e2e` | `playwright test` | `playwright test --project=parallel && playwright test --project=serial-financial --workers=1` |
| `test:e2e:parallel` | *(new)* | `playwright test --project=parallel` |
| `test:e2e:serial` | *(new)* | `playwright test --project=serial-financial --workers=1` |

### Test file changes

| File | Change |
|------|--------|
| `pay-with-wallet.spec.ts` | Add `test.describe.configure({ mode: 'serial' })` inside the describe block |
| `pay-with-bank.spec.ts` | Add `test.describe.configure({ mode: 'serial' })` inside the describe block |
