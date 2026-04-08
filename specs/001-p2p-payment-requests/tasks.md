# Tasks: Peer-to-Peer Payment Request Flow

**Input**: Design documents from `/specs/001-p2p-payment-requests/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/api.md, quickstart.md

**Tests**: Included — explicitly requested (Vitest unit tests + Playwright E2E tests).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in this phase)
- **[Story]**: Which user story this task belongs to (US1–US9, mapped from spec.md priorities P1–P9)
- All file paths are relative to repository root

---

## Phase 1: Setup (Project Infrastructure)

**Purpose**: Initialize the Next.js project, install dependencies, and configure tooling.

**Plan references**: Technical Context, Project Structure, quickstart.md

- [X] T001 Initialize Next.js 15 project with TypeScript 5.x, React 19, and App Router using pnpm in the repository root
- [X] T002 Install runtime dependencies with pnpm: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, and configure Tailwind CSS 4
- [X] T003 [P] Create `.env.example` with all required environment variables per quickstart.md
- [X] T004 [P] Configure Vitest with TypeScript support and path aliases in `vitest.config.ts`
- [X] T005 [P] Configure Playwright with base URL and test directory in `playwright.config.ts`
- [X] T006 [P] Configure ESLint and Prettier for TypeScript and Next.js conventions
- [X] T007 Add package scripts to `package.json`: `dev`, `build`, `test`, `test:watch`, `test:e2e`, `lint` (run via pnpm)

**Checkpoint**: Project scaffolded — `pnpm dev` starts, `pnpm test` runs, `pnpm test:e2e` is configured.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, Supabase configuration, shared types, transaction infrastructure, audit service, and base UI components. MUST be complete before any user story.

**Plan references**: Sections 1–3, 10–11, data-model.md, research.md decisions #1–#7

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database & Infrastructure

- [ ] T008 Create database migration with all tables (users, wallets, bank_accounts, payment_requests, payment_transactions, audit_logs), constraints, indexes, and RLS policies in `supabase/migrations/001_initial_schema.sql`
- [ ] T009 Create `payment_requests_view` with `effective_status` computed column for lazy expiration in `supabase/migrations/001_initial_schema.sql`
- [ ] T010 Create Postgres functions for atomic financial transactions (`process_payment`, `process_top_up`) invoked via `rpc()` in `supabase/migrations/002_rpc_functions.sql`
- [ ] T011 Create seed data script with two test users (Alice, Bob), wallets, bank accounts, and sample requests in `supabase/seed.sql`

### Supabase Client Configuration

- [ ] T012 [P] Create Supabase server-side client factory using `@supabase/ssr` in `src/lib/supabase/server.ts`
- [ ] T013 [P] Create Supabase browser-side client factory in `src/lib/supabase/client.ts`
- [ ] T014 [P] Create Supabase middleware helper for cookie-based auth in `src/lib/supabase/middleware.ts`
- [ ] T015 [P] Create Supabase admin client (service-role, bypasses RLS) in `src/lib/db/client.ts`

### TypeScript Types & Constants

- [ ] T016 [P] Define database row types for all six entities in `src/lib/types/database.ts`
- [ ] T017 [P] Define domain types, enums (RequestStatus, TransactionType, FundingSourceType, ActorType, AuditAction) in `src/lib/types/domain.ts`
- [ ] T018 [P] Define ActionResult envelope and all request/response types per contracts/api.md in `src/lib/types/api.ts`
- [ ] T019 [P] Define app-wide constants (amount bounds, note max length, expiration days, pagination defaults, mocked bank balance) in `src/lib/constants.ts`

### Core Infrastructure

- [ ] T020 Create transaction helper wrapping Supabase `rpc()` calls in `src/lib/db/transactions.ts`
- [ ] T021 Implement audit service (createAuditLog) supporting user, guest, and system actor types in `src/lib/services/audit-service.ts`
- [ ] T022 [P] Create common validators (email format, E.164 phone format, amount bounds) using Zod in `src/lib/validators/common-validators.ts`
- [ ] T022a [P] Create `formatCents` money formatting utility (integer cents → `$X.XX` via `Intl.NumberFormat`) in `src/lib/utils.ts`
- [ ] T023 Create Next.js middleware for auth redirect and public route detection in `src/middleware.ts`

### Shared UI Components

- [ ] T024 [P] Build Button component with primary, secondary, danger, disabled, and loading variants in `src/components/ui/button.tsx`
- [ ] T025 [P] Build Card component with optional header and footer in `src/components/ui/card.tsx`
- [ ] T026 [P] Build Input component with label, error state, and help text in `src/components/ui/input.tsx`
- [ ] T027 [P] Build Select component with label and error state in `src/components/ui/select.tsx`
- [ ] T028 [P] Build Modal component for confirmation dialogs in `src/components/ui/modal.tsx`
- [ ] T029 [P] Build Badge component with color-coded status variants in `src/components/ui/badge.tsx`
- [ ] T030 [P] Build Spinner loading indicator component in `src/components/ui/spinner.tsx`
- [ ] T031 [P] Build EmptyState component with illustration, message, and optional CTA in `src/components/ui/empty-state.tsx`
- [ ] T032 [P] Build ErrorMessage component for inline and toast error display in `src/components/ui/error-message.tsx`

### App Shell

- [ ] T033 Create root layout with global styles and Supabase provider in `src/app/layout.tsx`
- [ ] T034 Create `(auth)` route group layout with auth check and navigation sidebar in `src/app/(auth)/layout.tsx`
- [ ] T035 Create landing page with auth-based redirect to dashboard in `src/app/page.tsx`

**Checkpoint**: Foundation ready — database schema applied, Supabase configured, shared UI components available, auth middleware active. User story implementation can now begin.

---

## Phase 3: User Story 1 — Create a Payment Request (Priority: P1) 🎯 MVP

**Goal**: A signed-in user can create a payment request by specifying recipient, amount, and optional note. The system validates inputs, creates a pending request, and provides a shareable link.

**Independent Test**: Sign in, fill out the request form with valid inputs, verify the request appears in outgoing list with a copyable shareable link.

**Plan references**: Sections 2, 4, 8 (createRequest action); spec.md US1 acceptance scenarios

### Tests for User Story 1

> Write these tests FIRST — ensure they FAIL before implementation.

- [ ] T036 [P] [US1] Unit tests for request validators (email/phone format, amount bounds, note length, self-request rejection) in `tests/unit/validators/request-validators.test.ts`
- [ ] T037 [P] [US1] Unit tests for request service (createRequest, state machine transitions, expiration check) in `tests/unit/services/request-service.test.ts`

### Implementation for User Story 1

- [ ] T038 [P] [US1] Create request validators (recipientType, recipientValue, amountCents, note, self-request check) using Zod in `src/lib/validators/request-validators.ts`
- [ ] T039 [US1] Implement request service with `createRequest`, `declineRequest`, `cancelRequest`, `validateTransition`, and `VALID_TRANSITIONS` state machine in `src/lib/services/request-service.ts`
- [ ] T040 [US1] Implement `createRequest` server action with validation, auth, active-user check, and audit logging in `src/lib/actions/request-actions.ts`
- [ ] T041 [P] [US1] Build RequestForm component (recipient type selector, contact input, amount input, note textarea, submit with loading state) in `src/components/requests/request-form.tsx`
- [ ] T042 [P] [US1] Build ShareableLink component (display URL, copy-to-clipboard button) in `src/components/requests/shareable-link.tsx`
- [ ] T043 [US1] Create "New Request" page wiring RequestForm to createRequest action, showing success with ShareableLink in `src/app/(auth)/requests/new/page.tsx`
- [ ] T044 [US1] E2E test: create request with email, create with phone, validation errors, self-request rejection, shareable link generation in `tests/e2e/create-request.spec.ts`

**Checkpoint**: User Story 1 fully functional — a user can create payment requests and receive shareable links.

---

## Phase 4: User Story 2 — Pay a Pending Request as Signed-In Recipient (Priority: P2)

**Goal**: A signed-in recipient can pay a pending request using their wallet or connected bank account. Payment is atomic — balances update or nothing changes.

**Independent Test**: Create a pending request, have the recipient select a funding source, pay, and verify status becomes "paid" with correct balance changes.

**Plan references**: Sections 2, 5 (Payment Processing Flow); contracts/api.md payRequest; research.md decision #1 (atomic transactions)

### Tests for User Story 2

- [ ] T045 [P] [US2] Unit tests for payment validators in `tests/unit/validators/payment-validators.test.ts`
- [ ] T046 [P] [US2] Unit tests for payment service (wallet payment, bank payment, insufficient balance, duplicate prevention, atomic rollback) in `tests/unit/services/payment-service.test.ts`

### Implementation for User Story 2

- [ ] T047 [P] [US2] Create payment validators (requestId, fundingSource) using Zod in `src/lib/validators/payment-validators.ts`
- [ ] T048 [US2] Implement payment service with `processPayment` (wallet path + bank path, row locking, balance transfer, audit log) in `src/lib/services/payment-service.ts`
- [ ] T049 [US2] Implement `payRequest` server action with validation, recipient check, expiration check, and duplicate prevention in `src/lib/actions/payment-actions.ts`
- [ ] T050 [P] [US2] Build FundingSourceSelector component (wallet balance display, bank account option, disabled states with guidance) in `src/components/payment/funding-source-selector.tsx`
- [ ] T051 [P] [US2] Build PaymentConfirmation modal (amount, funding source summary, confirm/cancel buttons, loading state) in `src/components/payment/payment-confirmation.tsx`
- [ ] T052 [US2] E2E test: pay with wallet (sufficient balance), pay with bank, insufficient balance rejection, double-click prevention in `tests/e2e/pay-with-wallet.spec.ts`
- [ ] T053 [US2] E2E test: pay with bank account, insufficient bank balance rejection in `tests/e2e/pay-with-bank.spec.ts`

**Checkpoint**: User Story 2 fully functional — recipients can pay requests via wallet or bank with full atomicity guarantees.

---

## Phase 5: User Story 3 — View and Manage Requests via Dashboard (Priority: P3)

**Goal**: Signed-in users see all their requests organized by incoming (money requested from them) and outgoing (money they requested), with search and filter.

**Independent Test**: Create requests in various states, verify the dashboard displays them correctly in the right tab with accurate details, and search/filter work.

**Plan references**: Section 9 (Dashboard Page), Section 8 (GET /api/requests); contracts/api.md GET /api/requests

### Implementation for User Story 3

- [ ] T054 [P] [US3] Build RequestStatusBadge component (color-coded status labels with effective_status support) in `src/components/requests/request-status-badge.tsx`
- [ ] T055 [P] [US3] Build ExpirationCountdown component (relative time display for pending requests nearing expiry) in `src/components/requests/expiration-countdown.tsx`
- [ ] T056 [P] [US3] Build RequestCard component (amount, counterparty, note preview, date, status badge, expiration) in `src/components/requests/request-card.tsx`
- [ ] T057 [US3] Build RequestList component (renders RequestCard list, handles empty state) in `src/components/requests/request-list.tsx`
- [ ] T058 [US3] Implement GET `/api/requests` route handler with tab switching (incoming/outgoing), status filter, search by counterparty, pagination — query `payment_requests_view` for `effective_status` in `src/app/api/requests/route.ts`
- [ ] T059 [US3] Create `useRequests` hook for dashboard data fetching and search/filter state management in `src/hooks/use-requests.ts`
- [ ] T060 [US3] Create Dashboard page with incoming/outgoing tabs, search bar, status filter, RequestList, loading skeleton, and empty states in `src/app/(auth)/dashboard/page.tsx`

**Checkpoint**: User Story 3 fully functional — users can browse, search, and filter all their payment requests.

---

## Phase 6: User Story 4 — View Request Details and Take Action (Priority: P4)

**Goal**: A signed-in user views full request details. Recipients of pending requests see pay/decline options; requesters see cancel. Non-pending requests are read-only.

**Independent Test**: Open a pending request as different roles and verify correct action buttons appear; open non-pending requests and verify read-only state.

**Plan references**: Section 9 (Request Detail Page, Component Hierarchy); spec.md US4 acceptance scenarios

### Implementation for User Story 4

- [ ] T061 [US4] Build RequestDetail component (full details: amount, note, sender, recipient, timestamps, status, expiration countdown, read-only variant) in `src/components/requests/request-detail.tsx`
- [ ] T062 [US4] Create authenticated request detail page with server-side data fetch (query `payment_requests_view` for `effective_status`), role detection, 404 not-found state for invalid/inaccessible IDs, and conditional action rendering (pay/decline for recipient, cancel for requester, read-only for terminal) in `src/app/(auth)/requests/[id]/page.tsx`
- [ ] T063 [US4] Wire FundingSourceSelector and PaymentConfirmation (from US2) into the request detail page for recipient payment flow
- [ ] T064 [US4] Add shareable link display to the request detail page for outgoing requests (requester view)

**Checkpoint**: User Story 4 fully functional — detail view is the action hub for all request lifecycle operations.

---

## Phase 7: User Story 5 — Connect a Mocked Bank Account (Priority: P5)

**Goal**: A signed-in user connects a simulated bank account. If they already have one, the new one replaces it. The bank account is then usable for payments and top-ups.

**Independent Test**: Complete the bank connection flow, verify the bank account appears with correct metadata and usable balance.

**Plan references**: Section 2 (bank-service), Section 8 (connectBankAccount action); contracts/api.md connectBankAccount; research.md decision #8

### Implementation for User Story 5

- [ ] T065 [US5] Implement bank service (connectBankAccount — create with mocked $10,000 balance, replace existing, soft-delete old) in `src/lib/services/bank-service.ts`
- [ ] T066 [US5] Implement `connectBankAccount` server action with validation, active-user check, and audit logging in `src/lib/actions/bank-actions.ts`
- [ ] T067 [P] [US5] Build BankConnectFlow component (simulated bank selection, account number input, confirmation step, loading state) in `src/components/bank/bank-connect-flow.tsx`
- [ ] T068 [P] [US5] Build BankAccountCard component (bank name, masked account number, balance display, disconnect option) in `src/components/bank/bank-account-card.tsx`
- [ ] T069 [US5] Create `useBank` hook for bank account data fetching in `src/hooks/use-bank.ts`
- [ ] T070 [US5] Create Settings page with BankConnectFlow and BankAccountCard in `src/app/(auth)/settings/page.tsx`

**Checkpoint**: User Story 5 fully functional — users can connect and manage a mocked bank account.

---

## Phase 8: User Story 6 — Top Up Wallet from Connected Bank (Priority: P6)

**Goal**: A signed-in user with a connected bank transfers funds to their wallet. The transfer is atomic.

**Independent Test**: Top up with a valid amount from a connected bank, verify wallet balance increases and bank balance decreases.

**Plan references**: Section 6 (Wallet and Balance Management); contracts/api.md topUpWallet; research.md decision #1

### Tests for User Story 6

- [ ] T071 [P] [US6] Unit tests for wallet service (topUp validation, balance calculation, insufficient bank balance) in `tests/unit/services/wallet-service.test.ts`

### Implementation for User Story 6

- [ ] T072 [US6] Implement wallet service (getBalance, topUpFromBank — atomic bank debit + wallet credit, audit logging) in `src/lib/services/wallet-service.ts`
- [ ] T073 [US6] Implement `topUpWallet` server action with validation, bank check, balance check, and atomic transfer in `src/lib/actions/wallet-actions.ts`
- [ ] T074 [P] [US6] Build WalletBalance component (formatted balance display, last updated) in `src/components/wallet/wallet-balance.tsx`
- [ ] T075 [P] [US6] Build TopUpForm component (amount input, bank account selector, confirm button, loading/error states) in `src/components/wallet/top-up-form.tsx`
- [ ] T076 [US6] Create `useWallet` hook for wallet data fetching in `src/hooks/use-wallet.ts`
- [ ] T077 [US6] Create Wallet page with WalletBalance, TopUpForm, and BankAccountCard in `src/app/(auth)/wallet/page.tsx`
- [ ] T078 [US6] E2E test: successful top-up, insufficient bank balance rejection, no bank connected guidance in `tests/e2e/wallet-topup.spec.ts`

**Checkpoint**: User Story 6 fully functional — users can fund their wallets from their connected bank.

---

## Phase 9: User Story 7 — Pay via Public Shareable Link as Guest (Priority: P7)

**Goal**: A non-registered user opens a shareable link, sees request details, connects a guest bank account inline, and pays. Terminal requests show read-only status.

**Independent Test**: Open a shareable link in an unauthenticated session, complete guest bank connection and payment, verify request becomes "paid."

**Plan references**: Section 7 (Public Request and Guest Payment Flow); contracts/api.md POST /api/pay-guest, POST /api/bank-guest; research.md decisions #4, #8

### Implementation for User Story 7

- [ ] T079 [US7] Create in-memory IP-based rate limiter utility (token bucket, 10 req/IP/min) in `src/lib/rate-limit.ts`
- [ ] T080 [US7] Implement POST `/api/bank-guest` route handler with validation, rate limiting, guest bank account creation in `src/app/api/bank-guest/route.ts`
- [ ] T081 [US7] Implement POST `/api/pay-guest` route handler with validation, rate limiting, atomic guest payment, and audit logging in `src/app/api/pay-guest/route.ts`
- [ ] T082 [US7] Build GuestPaymentFlow component (inline BankConnectFlow for guests + PaymentConfirmation, no wallet option) in `src/components/payment/guest-payment-flow.tsx`
- [ ] T083 [US7] Create public payment page (`/pay/[token]`) with server-side request fetch by share_token from `payment_requests_view`, conditional rendering (pending: guest payment flow, terminal: read-only status, not found: 404) in `src/app/pay/[token]/page.tsx`
- [ ] T084 [US7] Add signed-in recipient redirect logic to middleware for `/pay/[token]` routes (redirect to `/requests/[id]`) in `src/middleware.ts`
- [ ] T085 [US7] E2E test: guest views pending request, guest pays via bank, guest views terminal request, invalid link 404 in `tests/e2e/public-payment.spec.ts`

**Checkpoint**: User Story 7 fully functional — guests can pay requests via shareable links without an account.

---

## Phase 10: User Story 8 — Decline or Cancel a Pending Request (Priority: P8)

**Goal**: A recipient can decline a pending request; a requester can cancel their own. Both are final, read-only states.

**Independent Test**: Decline a pending incoming request as recipient, cancel a pending outgoing request as requester, verify terminal states and no further actions.

**Plan references**: Section 4 (Request Lifecycle); contracts/api.md declineRequest, cancelRequest; spec.md US8

### Implementation for User Story 8

- [ ] T086 [US8] Implement `declineRequest` server action (recipient auth, pending check, expiration check, state transition, audit log) in `src/lib/actions/request-actions.ts`
- [ ] T087 [US8] Implement `cancelRequest` server action (requester auth, pending check, expiration check, state transition, audit log) in `src/lib/actions/request-actions.ts`
- [ ] T088 [US8] Add decline and cancel action buttons with confirmation modals to the request detail page in `src/app/(auth)/requests/[id]/page.tsx`
- [ ] T089 [US8] E2E test: decline as recipient, cancel as requester, invalid role rejection, already-terminal rejection in `tests/e2e/decline-cancel.spec.ts`

**Checkpoint**: User Story 8 fully functional — all lifecycle exit paths work.

---

## Phase 11: User Story 9 — Request Expiration (Priority: P9)

**Goal**: Pending requests expire after 7 days. Expired requests block all actions and are clearly marked in the UI.

**Independent Test**: Create a request, advance past expiration, verify status is "expired" and all actions are rejected.

**Plan references**: Section 4 (Expiration Behavior); research.md decision #2 (lazy expiration); spec.md US9

### Tests for User Story 9

- [ ] T090 [P] [US9] Unit tests for state machine covering all valid/invalid transitions and expiration enforcement in `tests/unit/state-machine.test.ts`

### Implementation for User Story 9

- [ ] T091 [US9] Verify and harden expiration enforcement in all action paths (payRequest, declineRequest, cancelRequest, pay-guest) across service and action layers
- [ ] T092 [US9] Ensure ExpirationCountdown (from US3) and expired state display are rendered correctly on dashboard cards and request detail page
- [ ] T093 [US9] E2E test: expired request blocks payment, expired status displays on dashboard and detail, countdown display for near-expiry, public link shows expired read-only in `tests/e2e/expiration.spec.ts`

**Checkpoint**: User Story 9 fully functional — expiration is enforced everywhere and clearly communicated.

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Quality improvements that affect multiple user stories.

- [ ] T094 [P] Update `README.md` with project overview, architecture summary, setup instructions, and development commands
- [ ] T095 [P] Add `loading.tsx` files with skeleton UI for all page routes (`dashboard`, `requests/new`, `requests/[id]`, `wallet`, `settings`, `pay/[token]`)
- [ ] T096 Audit all pages for complete UX state coverage: intentional loading, success, error, empty, and disabled states per plan section 12
- [ ] T097 Security review: verify all server actions validate auth, ownership, active status, and expiration before mutation
- [ ] T098 [P] Extract shared form patterns and common layout utilities into `src/lib/utils.ts`
- [ ] T099 Run full quickstart.md validation: fresh setup, migrations, seed, dev server, both test suites pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **User Stories (Phases 3–11)**: All depend on Phase 2 completion
  - Can proceed in priority order (P1 → P2 → ... → P9) or partially in parallel
- **Polish (Phase 12)**: Depends on all desired user stories being complete

### User Story Dependencies

| Story | Can Start After | Soft Dependencies |
|-------|----------------|-------------------|
| US1 (P1) | Phase 2 | None — fully independent |
| US2 (P2) | Phase 2 | US1 (needs requests to pay), US5 (for bank payment path) |
| US3 (P3) | Phase 2 | US1 (needs requests to display) |
| US4 (P4) | Phase 2 | US1 (needs request data), US2 (wires pay flow) |
| US5 (P5) | Phase 2 | None — fully independent |
| US6 (P6) | Phase 2 | US5 (needs connected bank account) |
| US7 (P7) | Phase 2 | US1 (needs shareable links), US5 logic reused |
| US8 (P8) | Phase 2 | US1 (needs pending requests), US4 (detail page exists) |
| US9 (P9) | Phase 2 | US1 (needs requests), touches US2/US7/US8 action paths |

### Recommended Sequential Order

For a single developer working through the stories:

```
Phase 1 → Phase 2 → US1 → US5 → US2 → US3 → US4 → US6 → US8 → US7 → US9 → Phase 12
```

**Rationale**: US5 (bank) before US2 (pay) enables the full bank payment path. US3 (dashboard) and US4 (detail) provide the UI surfaces for US2's payment and US8's decline/cancel. US6 (top-up) needs US5's bank account. US7 (guest) builds on all prior patterns. US9 (expiration) is a cross-cutting hardening pass.

### Within Each User Story

1. Tests MUST be written and FAIL before implementation (when test tasks exist)
2. Validators before services
3. Services before server actions
4. Server actions before UI components
5. Components before page assembly
6. E2E tests after page is functional

### Parallel Opportunities

- All Phase 2 tasks marked [P] can run in parallel (once Phase 1 completes)
- All UI component tasks marked [P] within a story can run in parallel
- Test tasks marked [P] can run in parallel with other test tasks
- Different user stories CAN be worked on in parallel by different developers after Phase 2

---

## Parallel Example: Phase 2 — UI Components

```
# All [P] UI components can be built simultaneously:
Task: "Build Button component in src/components/ui/button.tsx"
Task: "Build Card component in src/components/ui/card.tsx"
Task: "Build Input component in src/components/ui/input.tsx"
Task: "Build Select component in src/components/ui/select.tsx"
Task: "Build Modal component in src/components/ui/modal.tsx"
Task: "Build Badge component in src/components/ui/badge.tsx"
Task: "Build Spinner component in src/components/ui/spinner.tsx"
Task: "Build EmptyState component in src/components/ui/empty-state.tsx"
Task: "Build ErrorMessage component in src/components/ui/error-message.tsx"
```

## Parallel Example: User Story 1

```
# Tests (write first, ensure they fail):
Task: "Unit test for request validators in tests/unit/validators/request-validators.test.ts"
Task: "Unit test for request service in tests/unit/services/request-service.test.ts"

# Then validators and UI components in parallel:
Task: "Create request validators in src/lib/validators/request-validators.ts"
Task: "Build RequestForm component in src/components/requests/request-form.tsx"
Task: "Build ShareableLink component in src/components/requests/shareable-link.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 — Create Request
4. **STOP and VALIDATE**: Test US1 independently — create requests, verify shareable links
5. Deploy/demo if ready — users can already ask for money

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Create Request) → Test → **MVP!** Users can create and share payment requests
3. US5 (Bank) + US2 (Pay) → Test → Users can pay requests (core value loop complete)
4. US3 (Dashboard) + US4 (Detail) → Test → Full request management UI
5. US6 (Top-Up) → Test → Wallet funding from bank
6. US8 (Decline/Cancel) → Test → Full lifecycle control
7. US7 (Guest Payment) → Test → Viral growth via shareable links
8. US9 (Expiration) → Test → Business rule enforcement
9. Polish → Production-ready

### Parallel Team Strategy

With multiple developers after Phase 2:

- **Developer A**: US1 → US2 → US8 (request creation, payment, decline/cancel — the core lifecycle)
- **Developer B**: US5 → US6 → US3 → US4 (bank, wallet, dashboard, detail — supporting infrastructure & UI)
- **Developer C**: US7 → US9 → Phase 12 (guest flow, expiration, polish)

---

## Summary

| Metric | Count |
|--------|-------|
| **Total tasks** | 100 |
| **Phase 1 (Setup)** | 7 |
| **Phase 2 (Foundational)** | 29 |
| **US1 — Create Request** | 9 (2 test + 7 impl) |
| **US2 — Pay Request** | 9 (2 test + 7 impl) |
| **US3 — Dashboard** | 7 |
| **US4 — Request Detail** | 4 |
| **US5 — Bank Account** | 6 |
| **US6 — Top Up Wallet** | 8 (1 test + 7 impl) |
| **US7 — Guest Payment** | 7 |
| **US8 — Decline/Cancel** | 4 |
| **US9 — Expiration** | 4 (1 test + 3 impl) |
| **Phase 12 (Polish)** | 6 |
| **Parallelizable tasks** | 40 |
| **Unit test suites** | 6 |
| **E2E test suites** | 7 |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps each task to a user story for traceability
- Each user story is independently completable and testable
- Verify unit tests fail before implementing (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- All monetary values stored as integer cents — never use floats
- All financial mutations are atomic (Postgres transactions via `rpc()`)
- Audit logs are created within the same transaction as the action
