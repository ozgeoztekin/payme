# Tasks: Parallel E2E Test Organization

**Input**: Design documents from `/specs/006-parallel-e2e-tests/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

**Tests**: This feature is test-infrastructure only. Validation is by running Playwright (see T009).

**Organization**: Tasks are grouped by user story (US1–US3) from spec.md. Setup and foundational work precede story tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label from spec.md (US1, US2, US3)
- Paths are relative to repository root unless noted

---

## Phase 1: Setup

**Purpose**: Confirm design artifacts before changing config or scripts.

- [x] T001 Confirm `specs/006-parallel-e2e-tests/plan.md` and `specs/006-parallel-e2e-tests/spec.md` match the intended parallel vs serial file split (parallel: 7 files; serial-financial: 3 files)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Playwright must expose two projects before story-specific npm scripts are meaningful.

**⚠️ CRITICAL**: Complete T002 before T003–T007.

- [x] T002 Update `playwright.config.ts`: remove the single `chromium` project; add projects `parallel` and `serial-financial` with `testMatch` globs per `specs/006-parallel-e2e-tests/plan.md`; set root `workers` to `process.env.CI ? 2 : 4`; set `fullyParallel: true` on `parallel` and `fullyParallel: false` on `serial-financial`; keep `globalSetup`, `use`, `webServer`, `retries`, `forbidOnly`, and `reporter` behavior aligned with current repo defaults

**Checkpoint**: `npx playwright test --list --project=parallel` and `--project=serial-financial` each show the expected specs only.

---

## Phase 3: User Story 1 - Parallel-safe tests run concurrently (Priority: P1) 🎯 MVP

**Goal**: Parallel-safe e2e files run with multiple workers via a dedicated npm script.

**Independent Test**: `npm run test:e2e:parallel` completes with all parallel-project tests passing (requires `.env.local` / Supabase as today).

### Implementation for User Story 1

- [x] T003 [US1] Add npm script `test:e2e:parallel` in `package.json`: `playwright test --project=parallel`

**Checkpoint**: Parallel group runs alone with multiple workers; no serial-financial specs execute.

---

## Phase 4: User Story 2 - Financial mutation tests run serially (Priority: P1)

**Goal**: Wallet/bank mutation specs run one worker at a time; describe-level serial ordering is a safety net inside each file.

**Independent Test**: `npm run test:e2e:serial` runs only `pay-with-wallet`, `pay-with-bank`, and `wallet-topup` with `--workers=1` and passes.

### Implementation for User Story 2

- [x] T004 [P] [US2] In `tests/e2e/pay-with-wallet.spec.ts`, inside `test.describe('Pay with Wallet (US2)', () => {`, add `test.describe.configure({ mode: 'serial' });` as the first statement in the callback
- [x] T005 [P] [US2] In `tests/e2e/pay-with-bank.spec.ts`, inside `test.describe('Pay with Bank Account (US2)', () => {`, add `test.describe.configure({ mode: 'serial' });` as the first statement in the callback
- [x] T006 [US2] Add npm script `test:e2e:serial` in `package.json`: `playwright test --project=serial-financial --workers=1`

**Checkpoint**: Serial-financial group passes alone; pay-with-wallet tests cannot interleave within the file if workers were misconfigured.

---

## Phase 5: User Story 3 - Full suite preserves global-setup isolation (Priority: P2)

**Goal**: Default `test:e2e` runs parallel group first (clean seed observation), then serial-financial with one worker; global setup runs once per `playwright` invocation (twice total), resetting seed before the serial phase.

**Independent Test**: `npm run test:e2e` runs both groups in order and passes; CI job `e2e-test` still succeeds.

### Implementation for User Story 3

- [x] T007 [US3] Replace `test:e2e` script in `package.json` with: `playwright test --project=parallel && playwright test --project=serial-financial --workers=1`

**Checkpoint**: Full suite matches ordering in `specs/006-parallel-e2e-tests/research.md` (parallel before serial-financial).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: CI alignment and regression checks.

- [x] T008 Verify `.github/workflows/ci.yml` e2e step still runs `npm run test:e2e` (no edit required unless the script name changed)
- [x] T009 Run `npm run lint` and `npm test` at repo root; run `npm run test:e2e` when Supabase env vars are available, or note in commit/PR that e2e was validated in CI only — **Note**: `npm run test:e2e` timed out locally when another dev server already held port 3000 (spawned server moved to 3002 while config waits for `:3000`). Stop the other process or rely on CI for full e2e.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies
- **Phase 2 (Foundational)**: Depends on Phase 1 (confirm docs) — blocks all story phases
- **Phase 3 (US1)**: Depends on T002
- **Phase 4 (US2)**: Depends on T002; T004 and T005 can run in parallel with each other before T006
- **Phase 5 (US3)**: Depends on T003 and T006 (full `test:e2e` chains both project runs)
- **Phase 6 (Polish)**: Depends on T007

### User Story Dependencies

- **US1**: Independent after T002; delivers faster feedback for parallel-only runs
- **US2**: Independent after T002; does not require US1 script for correctness, but T007 requires both T003 and T006
- **US3**: Depends on US1 and US2 npm scripts being present

### Within User Story 2

- T004 and T005 [P]: different files, no mutual dependency
- T006 after T004 and T005 (same `package.json` — avoid merge conflicts by doing T006 last or in one edit with T003/T007)

### Parallel Opportunities

- T004 and T005 can be implemented in parallel (different spec files)
- After T002, T003 (US1 script) and T004–T006 (US2) could be parallelized across developers if `package.json` edits are coordinated

---

## Parallel Example: User Story 2

```bash
# Two edits in parallel:
Task T004: tests/e2e/pay-with-wallet.spec.ts — add mode: 'serial'
Task T005: tests/e2e/pay-with-bank.spec.ts — add mode: 'serial'
# Then single edit:
Task T006: package.json — add test:e2e:serial
```

---

## Implementation Strategy

### MVP First (User Story 1 + Foundational)

1. Complete T001, T002, T003
2. Run `npm run test:e2e:parallel` and confirm green
3. Stop here if only parallel speedup is needed for local iteration

### Full Feature (All Stories)

1. Complete Phase 1–2
2. Complete US1 (T003), US2 (T004–T006), US3 (T007)
3. Complete Polish (T008–T009)

### Suggested PR Slices

- Slice A: T002 + T003 (parallel project + script)
- Slice B: T004 + T005 + T006 (serial annotations + serial script)
- Slice C: T007 + T008 + T009 (default suite + verification)

---

## Notes

- Do not add new e2e spec files in this feature; only config, `package.json`, and two existing specs change per [data-model.md](./data-model.md).
- If `package.json` scripts are edited in one commit, prefer ordering: add `test:e2e:parallel` and `test:e2e:serial` before changing `test:e2e` to reduce broken intermediate states.
- Total tasks: **9** (T001–T009)
- Task count per story: US1 → 1 implementation task (T003); US2 → 3 tasks (T004–T006); US3 → 1 task (T007); Setup 1; Foundational 1; Polish 2
