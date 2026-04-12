# Tasks: Currency-Safe Money Fields

**Input**: Design documents from `/specs/004-currency-safe-money/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Test updates are included because the spec explicitly requires them (FR-018, SC-003).

**Organization**: US1 (rename) and US2 (currency column) are co-prioritized P1 and ship atomically — they share the foundational phase and a combined backend phase. US3 (formatting) is P2 and handled separately. US4 (safe migration) is satisfied by the foundational migration task.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Migration + Core Types)

**Purpose**: Database migration, core types, constants, and validators that BLOCK all subsequent phases

**⚠️ CRITICAL**: No backend or UI work can begin until this phase is complete

- [X] T001 Create migration with column renames, currency columns, CHECK constraints, updated RPC functions (`process_payment`, `process_top_up`), and replaced `handle_new_user` trigger (`balance_cents` → `balance_minor`) in supabase/migrations/004_currency_safe_money.sql — see data-model.md for schema and research.md R1–R3 for strategy
- [X] T002 Update seed data to use `amount_minor`, `balance_minor`, and add `currency` column values in supabase/seed.sql
- [X] T003 [P] Rename money constants and add `SUPPORTED_CURRENCIES`, `DEFAULT_CURRENCY`, and `CURRENCY_EXPONENTS` map in src/lib/constants.ts — see data-model.md Constants Changes
- [X] T004 [P] Update database row types: rename `*_cents` → `*_minor`, add `currency: string` to `WalletRow`, `BankAccountRow`, `PaymentRequestRow`, `PaymentTransactionRow` in src/lib/types/database.ts
- [X] T005 [P] Update API types: rename `amountCents` → `amountMinor` and `amount_cents` → `amount_minor`, add `currency` to `CreateRequestInput`, `TopUpWalletInput`, `PaymentRequestListItem` in src/lib/types/api.ts
- [X] T006 [P] Rename `amountCentsSchema` → `amountMinorSchema`, update constant imports, and add `currencySchema` using `SUPPORTED_CURRENCIES` in src/lib/validators/common-validators.ts

**Checkpoint**: Migration ready, types consistent, constants and validators updated. Run `npx supabase db reset` to verify migration applies cleanly.

---

## Phase 2: US1+US2 — Backend Services, Actions & API Routes (Priority: P1)

**Goal**: Propagate renamed fields and currency through all server-side code so the backend is fully consistent with the new schema.

**Independent Test**: All server actions, services, and API routes compile without type errors and pass existing unit tests (with updated field names).

### Services

- [X] T007 [P] [US1] Update all `amount_cents` → `amount_minor` references, add currency to inserts in src/lib/services/request-service.ts
- [X] T008 [P] [US1] Update `balance_cents` → `balance_minor`, `p_amount_cents` → `p_amount_minor`, and error message matching in src/lib/services/wallet-service.ts
- [X] T009 [P] [US2] Update `balance_cents` → `balance_minor`, `MOCKED_BANK_BALANCE_CENTS` → `MOCKED_BANK_BALANCE_MINOR`, add currency to bank connect inserts in src/lib/services/bank-service.ts
- [X] T010 [P] [US2] Update `balance_cents` → `balance_minor`, add currency to wallet creation in src/lib/services/profile-service.ts

### DB Layer

- [X] T011 [P] [US1] Update `amountCents` → `amountMinor`, `p_amount_cents` → `p_amount_minor` in RPC call params in src/lib/db/transactions.ts

### Server Actions

- [X] T012 [P] [US1] Update `balance_cents` → `balance_minor`, `amount_cents` → `amount_minor`, `amountCents` → `amountMinor` in src/lib/actions/wallet-actions.ts
- [X] T013 [P] [US1] Update `balance_cents` → `balance_minor`, `amount_cents` → `amount_minor` balance checks and comparisons in src/lib/actions/payment-actions.ts
- [X] T013b [P] [US1] Update `amountCents` → `amountMinor` in src/lib/actions/request-actions.ts

### API Routes

- [X] T014 [P] [US1] Update `amount_cents` → `amount_minor`, add `currency` to serialized response in src/app/api/requests/route.ts
- [X] T015 [P] [US1] Update `balance_cents` → `balance_minor`, `amount_cents` → `amount_minor` in src/app/api/pay-guest/route.ts
- [X] T016 [P] [US2] Update `balance_cents` → `balance_minor`, add `currency` to mock and response in src/app/api/bank-guest/route.ts

### Validators (downstream)

- [X] T017 [P] [US1] Update any remaining `amountCents` references in request and payment validators in src/lib/validators/request-validators.ts and src/lib/validators/payment-validators.ts

**Checkpoint**: Backend is fully migrated. All services, actions, API routes, and validators use `*_minor` and `currency`. Type-check with `npx tsc --noEmit`.

---

## Phase 3: US3 — Currency-Aware Formatting & UI (Priority: P2)

**Goal**: Update the formatting utility to be exponent-aware and currency-parameterized, then propagate through all UI components.

**Independent Test**: `formatMinor(5000, 'USD')` returns `$50.00`; `formatMinor(1500, 'EUR')` returns `€15.00`; `formatMinor(25000, 'TRY')` returns `₺250.00`. All pages render correctly.

### Formatting Utilities

- [X] T018 [US3] Rename `formatCents` → `formatMinor` (accept `currency` param, use `CURRENCY_EXPONENTS` map), rename `parseAmountToCents` → `parseAmountToMinor` (accept `currency` param), add explicit code comments documenting exponent assumptions in src/lib/utils.ts

### Pages

- [X] T019 [P] [US3] Update `formatCents` → `formatMinor` calls with currency, `balance_cents` → `balance_minor` in src/app/(auth)/dashboard/page.tsx
- [X] T020 [P] [US3] Update formatting calls to pass currency in src/app/(auth)/wallet/page.tsx
- [X] T021 [P] [US3] Update `amountCents` → `amountMinor` references in src/app/(auth)/requests/new/page.tsx
- [X] T022 [P] [US3] Update `amount_cents` → `amount_minor`, `balance_cents` → `balance_minor`, formatting calls in src/app/(auth)/requests/[id]/request-payment-flow.tsx
- [X] T023 [P] [US3] Update `amount_cents` → `amount_minor`, `amountCents` → `amountMinor`, formatting calls in src/app/pay/[token]/page.tsx

### Wallet & Bank Components

- [X] T024 [P] [US3] Update `formatCents` → `formatMinor` with currency, `balance_cents` → `balance_minor` in src/components/wallet/wallet-balance.tsx
- [X] T025 [P] [US3] Update `amountCents` → `amountMinor`, `AMOUNT_MIN_CENTS` → `AMOUNT_MIN_MINOR` in src/components/wallet/top-up-form.tsx
- [X] T026 [P] [US3] Update `formatCents` → `formatMinor` with currency, `balance_cents` → `balance_minor` in src/components/bank/bank-account-card.tsx

### Request Components

- [X] T027 [P] [US3] Update `AMOUNT_MIN_CENTS` → `AMOUNT_MIN_MINOR`, `AMOUNT_MAX_CENTS` → `AMOUNT_MAX_MINOR`, `amountCents` → `amountMinor` in src/components/requests/request-form.tsx
- [X] T028 [P] [US3] Update `formatCents` → `formatMinor` with currency, `amount_cents` → `amount_minor` in src/components/requests/request-card.tsx
- [X] T029 [P] [US3] Update `formatCents` → `formatMinor` with currency, `amount_cents` → `amount_minor` in src/components/requests/request-detail.tsx

### Payment Components

- [X] T030 [P] [US3] Update `formatCents` → `formatMinor` with currency, `balance_cents` → `balance_minor` in src/components/payment/funding-source-selector.tsx
- [X] T031 [P] [US3] Update `amountCents` → `amountMinor` in src/components/payment/guest-payment-flow.tsx
- [X] T032 [P] [US3] Update `amountCents` → `amountMinor` in src/components/payment/payment-confirmation.tsx

### Hooks

- [X] T033 [P] [US3] Update any `*_cents` references in src/hooks/use-requests.ts and src/hooks/use-wallet.ts

**Checkpoint**: All UI renders correctly. `formatMinor` is exponent-aware. Run `npm run dev` and visually verify dashboard, wallet, request, and payment pages display `$X.XX` for USD.

---

## Phase 4: Tests & Final Verification

**Purpose**: Update all test files and run full suite to verify zero regressions

### E2E Tests

- [X] T034 [P] Update `balance_cents` → `balance_minor`, add `currency` to fixture inserts in tests/e2e/global-setup.ts
- [X] T035 [P] Update `balance_cents` → `balance_minor` in bank restore fixture in tests/e2e/wallet-topup.spec.ts
- [X] T036 [P] Review and update any `_cents` references in tests/e2e/create-request.spec.ts, tests/e2e/pay-with-wallet.spec.ts, tests/e2e/pay-with-bank.spec.ts, tests/e2e/public-payment.spec.ts, tests/e2e/decline-cancel.spec.ts, tests/e2e/expiration.spec.ts

### Unit Tests

- [X] T037 [P] Update `p_amount_cents` → `p_amount_minor`, `balance_cents` → `balance_minor`, error string matching in tests/unit/services/wallet-service.test.ts
- [X] T038 [P] Update `amount_cents` → `amount_minor` in tests/unit/services/request-service.test.ts
- [X] T039 [P] Update `amountCents` → `amountMinor` in tests/unit/validators/request-validators.test.ts
- [X] T040 [P] Review and update any `_cents` references in tests/unit/services/payment-service.test.ts and tests/unit/validators/payment-validators.test.ts

### Verification

- [X] T041 Run `npx tsc --noEmit` to verify zero type errors
- [X] T042 Run full unit test suite with `npm test` and verify all tests pass
- [X] T043 Run full E2E test suite with `npx playwright test` and verify all tests pass
- [X] T044 Search entire codebase for remaining `_cents` references — verify zero matches in src/, tests/, supabase/ (excluding specs/ and audit log history)
- [X] T045 Run quickstart.md smoke test checklist (dashboard, create request, pay from wallet, pay from bank, top-up, public payment link)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately. BLOCKS all other phases.
- **US1+US2 Backend (Phase 2)**: Depends on Phase 1 completion (types, constants, validators must be in place).
- **US3 Formatting & UI (Phase 3)**: Depends on Phase 1 (constants, types) and Phase 2 (services must use new names for consistency). T018 (utils.ts) blocks all UI tasks.
- **Tests & Verification (Phase 4)**: Depends on Phases 1–3 completion (all source code must be updated before tests can pass).

### User Story Dependencies

- **US1 (Rename)**: Foundational rename in Phase 1 migration → Backend propagation in Phase 2 → UI propagation in Phase 3
- **US2 (Currency)**: Foundational currency column in Phase 1 migration → Backend propagation in Phase 2 → UI propagation in Phase 3
- **US3 (Formatting)**: Phase 1 constants (exponent map) → T018 formatter update → All UI tasks
- **US4 (Safe Migration)**: Satisfied entirely by T001 (migration) + T002 (seed) + T045 (verification)

### Within Each Phase

- Phase 1: T001 (migration) first → T002 (seed) after → T003–T006 can run in parallel
- Phase 2: All tasks [P] — can run in parallel (different files, no dependencies)
- Phase 3: T018 (utils.ts) FIRST → all other tasks [P] can run in parallel
- Phase 4: All test updates [P] → T041–T045 run sequentially as final verification

### Parallel Opportunities

- **Phase 1**: T003, T004, T005, T006 can all run in parallel (after T001)
- **Phase 2**: All 11 tasks (T007–T017) can run in parallel
- **Phase 3**: After T018, all 15 UI tasks (T019–T033) can run in parallel
- **Phase 4**: All 7 test update tasks (T034–T040) can run in parallel

---

## Parallel Example: Phase 2

```bash
# All backend tasks can run simultaneously (different files, no cross-dependencies):
Task T007: "Update request-service.ts"
Task T008: "Update wallet-service.ts"
Task T009: "Update bank-service.ts"
Task T010: "Update profile-service.ts"
Task T011: "Update transactions.ts"
Task T012: "Update wallet-actions.ts"
Task T013: "Update payment-actions.ts"
Task T014: "Update requests/route.ts"
Task T015: "Update pay-guest/route.ts"
Task T016: "Update bank-guest/route.ts"
Task T017: "Update request/payment validators"
```

## Parallel Example: Phase 3 (after T018)

```bash
# All UI tasks can run simultaneously after formatter is updated:
Task T019: "Update dashboard/page.tsx"
Task T024: "Update wallet-balance.tsx"
Task T026: "Update bank-account-card.tsx"
Task T027: "Update request-form.tsx"
Task T028: "Update request-card.tsx"
# ... etc (15 tasks total)
```

---

## Implementation Strategy

### MVP First (Phase 1 + Phase 2)

1. Complete Phase 1: Foundational (migration + types + constants)
2. Complete Phase 2: Backend propagation
3. **STOP and VALIDATE**: `npx tsc --noEmit` passes, `npx supabase db reset` succeeds
4. Backend is fully migrated — app won't render correctly yet (UI still uses old names)

### Incremental Delivery

1. Phase 1: Foundation ready → DB schema is correct
2. Phase 2: Backend consistent → All server-side code uses new names
3. Phase 3: UI updated → Full app renders correctly with currency-aware formatting
4. Phase 4: Tests green → Ship with confidence

### Single-Developer Strategy

1. Phase 1 (T001–T006): ~30 min — migration + types are the critical path
2. Phase 2 (T007–T017): ~45 min — mechanical rename across backend files
3. Phase 3 (T018–T033): ~60 min — formatter rewrite + mechanical rename across UI files
4. Phase 4 (T034–T045): ~30 min — test updates + final verification

**Estimated total**: ~3 hours

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are inseparable at the implementation level — the migration handles both atomically
- US4 (safe migration) is satisfied by T001 + T002 + T045 verification
- E2E tests that only assert displayed strings (`$50.00`) likely need no changes — only tests that reference column names or field names in fixtures need updating
- Commit after each phase checkpoint for safe rollback points
