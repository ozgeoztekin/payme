# Feature Specification: Parallel E2E Test Organization

**Feature Branch**: `006-parallel-e2e-tests`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "want to run the e2e tests that are safe to run in parallel in parallel with multiple workers. organize e2e test so that some of them are parallel to make it faster and some of them are in serial so data is not corrupted"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parallel-safe tests run concurrently (Priority: P1)

Tests that do not mutate shared financial state (wallet balances, bank accounts) run simultaneously across multiple Playwright workers, reducing total e2e suite time.

**Why this priority**: The primary goal is speed. Most of the test suite is read-only or creates isolated records; running it in parallel is both safe and directly reduces developer feedback time.

**Independent Test**: Running `npm run test:e2e:parallel` should complete the parallel group of tests across multiple workers without data conflicts.

**Acceptance Scenarios**:

1. **Given** the parallel test group is configured with 4 workers, **When** the suite runs, **Then** dashboard, create-request, decline-cancel, expiration, profile, and public-payment tests all execute concurrently and pass.
2. **Given** two parallel workers run read-only dashboard tests simultaneously, **When** both read Alice's wallet balance and bank account, **Then** both assertions pass with no race conditions.

---

### User Story 2 - Financial mutation tests run serially (Priority: P1)

Tests that debit wallet/bank balances or temporarily modify shared account records run one at a time, preventing balance corruption or missing-account failures.

**Why this priority**: Financial correctness is a constitutional requirement. A parallelism regression in financial tests is a release blocker per the constitution (Principle VI).

**Independent Test**: Running `npm run test:e2e:serial` should run pay-with-wallet, pay-with-bank, and wallet-topup tests sequentially and pass, with correct balances after each test.

**Acceptance Scenarios**:

1. **Given** pay-with-wallet and pay-with-bank tests run with `workers: 1`, **When** Bob's wallet is debited $10 by one test, **Then** the next test sees the updated balance and does not encounter a race condition.
2. **Given** wallet-topup test 3 temporarily deletes Alice's bank account, **When** no other test is running concurrently, **Then** the bank account is deleted and re-created without affecting other assertions.

---

### User Story 3 - Full suite preserves global-setup isolation (Priority: P2)

The global-setup (reset seed data) runs once before the full suite. The parallel group runs first, then the serial financial group runs after — so financial mutations only happen after read-only tests have observed clean initial state.

**Why this priority**: Ordering ensures the read-only tests observe the expected seed state (Alice has a bank account, Bob has $50 wallet balance) before financial tests mutate it.

**Acceptance Scenarios**:

1. **Given** `npm run test:e2e` is run, **When** the parallel group completes, **Then** the serial financial group starts with full confidence that shared seed state has not been mutated yet.
2. **Given** CI runs `npm run test:e2e`, **Then** both groups are run in sequence and artifacts are uploaded.

---

### Edge Cases

- What happens when a serial test fails mid-way (e.g., pay-with-wallet test 1 fails and wallet balance is partially changed)? Subsequent serial tests may see unexpected balances. Existing retry logic handles this up to 2 retries in CI.
- What if two parallel workers happen to sign in as the same user simultaneously? Each Playwright worker uses an isolated browser context, so auth sessions are fully isolated.
- What if wallet-topup test 3 fails before restoring Alice's bank account? The `finally` block ensures restoration; if the restoration itself fails, subsequent runs will repair state via global-setup.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `test:e2e:parallel` npm script that runs parallel-safe tests with multiple workers (4 locally, 2 in CI).
- **FR-002**: System MUST provide a `test:e2e:serial` npm script that runs financial mutation tests with exactly 1 worker.
- **FR-003**: The default `test:e2e` npm script MUST run the parallel group first, then the serial group, in sequence.
- **FR-004**: The Playwright config MUST define two projects: `parallel` (matching parallel-safe files) and `serial-financial` (matching financial mutation files).
- **FR-005**: `pay-with-wallet.spec.ts` and `pay-with-bank.spec.ts` MUST be marked `mode: 'serial'` at the describe level (currently missing).
- **FR-006**: The CI workflow MUST use the updated `test:e2e` script and preserve artifact upload behavior.

### Key Entities

- **Parallel-safe tests**: `dashboard-balance`, `dashboard-empty-state`, `create-request`, `decline-cancel`, `expiration`, `profile`, `public-payment`
- **Serial-financial tests**: `pay-with-wallet`, `pay-with-bank`, `wallet-topup`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Parallel group completes in under 60% of the time the full serial suite takes (rough target: if full suite takes 5 min serially, parallel group finishes in ~90s).
- **SC-002**: Zero flaky failures attributable to parallel execution — no balance mismatches, no missing-bank-account errors, no auth session conflicts across workers.
- **SC-003**: CI pipeline e2e job succeeds consistently with 2 workers for the parallel group.
- **SC-004**: All 10 existing test files are covered by one of the two projects (no orphan tests).

## Assumptions

- Workers: 4 locally, 2 in CI (CI runners have fewer cores; 2 is a safe default).
- The global-setup runs once before both groups (not duplicated per project).
- `fullyParallel: true` at the project level for the parallel group means tests across files AND within files may run concurrently (already safe since parallel-group files are isolated).
- The financial group runs with `--workers=1` via the npm script override, not via a per-project Playwright config setting (Playwright does not support per-project worker counts natively).
- Existing `test.describe.configure({ mode: 'serial' })` annotations in `decline-cancel`, `expiration`, `profile`, and `wallet-topup` are preserved.
