# Research: Parallel E2E Test Organization

## 1. Playwright Parallelism Mechanisms

**Decision**: Use two Playwright projects (`parallel` and `serial-financial`) with per-run `--workers` override for the serial group.

**Rationale**:
- Playwright's `workers` option is global, not per-project. The only clean way to force serial-financial tests to run one at a time is to pass `--workers=1` when running that project via the npm script.
- Using two projects with `testMatch` patterns cleanly separates the two groups in a single config file — no separate config files needed.
- `fullyParallel: true` at the project level allows tests within *and* across files to run in parallel for the parallel group. For the serial group this doesn't matter since we cap at 1 worker.
- `test.describe.configure({ mode: 'serial' })` at the file/describe level is a secondary safety net: even if someone accidentally runs the serial project with multiple workers, tests within each file still run in order.

**Alternatives considered**:
- *Separate config files* (`playwright.config.ts` + `playwright.config.serial.ts`): Rejected — doubles maintenance burden and diverges from the single-source-of-truth principle.
- *Project `dependencies`* (`serial-financial` depends on `parallel`): Useful but still doesn't enforce `workers: 1` for the dependent project — rejected as insufficient on its own.
- *Test tags + `--grep`*: Valid but requires adding `@parallel` / `@serial` annotations to every test — too invasive and error-prone.
- *Single project with `workers: 1`*: Preserves safety but abandons the speed improvement — rejected as it defeats the purpose.

---

## 2. Data Isolation Analysis Per Test File

### Read-only / payment_requests-only mutations (Parallel-safe)

| File | What it touches | Conflict risk with parallel peers |
|------|----------------|-----------------------------------|
| `dashboard-balance.spec.ts` | Reads Alice's wallet + bank display | None (read-only) |
| `dashboard-empty-state.spec.ts` | Reads dashboard filter UI | None (read-only) |
| `create-request.spec.ts` | Creates unique `payment_requests` rows | None (each test creates its own row) |
| `decline-cancel.spec.ts` | Creates unique requests, changes status | None (no balance mutations; already `mode: serial` within file) |
| `expiration.spec.ts` | Creates unique requests, modifies `expires_at` | None (no balance mutations; already `mode: serial` within file) |
| `profile.spec.ts` | Modifies `users.phone` for Alice | None; other parallel tests don't read Alice's phone; already `mode: serial` within file |
| `public-payment.spec.ts` | Creates requests with unique guest emails; credits Alice's wallet | Safe: Alice's wallet is only incremented; `dashboard-balance` only checks formatting (regex), not a specific value |

### Balance/account mutations (Serial-only)

| File | What it touches | Why serial |
|------|----------------|------------|
| `pay-with-wallet.spec.ts` | Debits Bob's wallet ($10 + $5 = $15 total) | Bob starts with $50; concurrent debit checks would see stale balances under parallel execution. `mode: serial` annotation **missing** — must be added. |
| `pay-with-bank.spec.ts` | Debits Bob's bank ($15 + $99 = $114 total); credits Alice's wallet | Bob's bank starts at $1,000,000 — amounts are trivially small. However, concurrent wallet tests could cause unexpected `wallets` row lock contention. `mode: serial` annotation **missing** — must be added. |
| `wallet-topup.spec.ts` | Credits Alice's wallet; **temporarily DELETES Alice's bank account** in test 3 | Test 3 deletes and re-creates Alice's bank account. Any concurrent test reading Alice's bank (e.g., `dashboard-balance`) would fail if run simultaneously. Already `mode: serial`. |

**Critical conflict identified**: `wallet-topup` test 3 deletes Alice's bank account. `dashboard-balance` checks for "Primary Bank" and "Connected". Running them concurrently WILL cause flakiness. Resolved by running `serial-financial` project only after `parallel` project completes.

---

## 3. Worker Count Selection

**Decision**: 4 workers locally, 2 workers in CI for the parallel group.

**Rationale**:
- The parallel group has 7 test files. With 4 workers, all can run concurrently (limited by file count, not by worker count).
- CI runners (GitHub Actions `ubuntu-latest`) have 2 vCPUs. Using 2 workers matches the hardware. Using 4 would cause thrashing.
- `process.env.CI ? 2 : 4` evaluated in the config adapts automatically.

---

## 4. `test.describe.configure({ mode: 'serial' })` — Current State

Files already annotated: `decline-cancel.spec.ts`, `expiration.spec.ts`, `profile.spec.ts`, `wallet-topup.spec.ts`.

Files **missing** the annotation that need it (financial mutations): `pay-with-wallet.spec.ts`, `pay-with-bank.spec.ts`.

Note: `public-payment.spec.ts` does not need `mode: serial` because its tests are independent (different guest emails, no debit operations).

---

## 5. Global Setup Impact

The `globalSetup` in `playwright.config.ts` runs once before any test. It:
- Creates Alice and Bob auth users if missing
- Resets wallet balances (Alice: 10000 minor = $100, Bob: 5000 minor = $50)
- Resets bank accounts (Alice: $10,000, Bob: $10,000)

With two npm scripts running separately (`test:e2e:parallel` then `test:e2e:serial`), global-setup runs twice. This is intentional and beneficial: the serial group starts with a clean slate of known balances.

**Trade-off**: Running global-setup twice adds ~2-3 seconds per run. Acceptable for correctness.
