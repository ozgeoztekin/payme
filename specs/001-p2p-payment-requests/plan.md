# Implementation Plan: Peer-to-Peer Payment Request Flow

**Branch**: `001-p2p-payment-requests` | **Date**: 2026-04-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-p2p-payment-requests/spec.md`

## Summary

Build a peer-to-peer payment request system as a Next.js web application using Supabase (Postgres + Auth), enabling users to create payment requests, pay via wallet or mocked bank account, share requests via public links for guest payments, and manage request lifecycles (decline, cancel, expiration). All financial operations are atomic, audited, and validated server-side.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Next.js 15 (App Router), React 19, Supabase (Auth + Postgres), Tailwind CSS 4  
**Storage**: Supabase-managed PostgreSQL  
**Testing**: Playwright (E2E), Vitest (unit)  
**Target Platform**: Web (deployed to Vercel)  
**Project Type**: Web application (monorepo — frontend and backend in one Next.js project)  
**Performance Goals**: Dashboard load < 3s for up to 500 requests; all critical operations provide feedback < 3s  
**Constraints**: Responsive from 320px to large desktop; all financial mutations atomic; single currency (USD, integer cents)  
**Scale/Scope**: MVP/POC — moderate user scale, single deployment

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Alignment | Notes |
|---|-----------|-----------|-------|
| I | Financial Integrity | PASS | All amounts stored as integer cents. Postgres `bigint` for money fields. No floating-point math for financial values. |
| II | Atomic and Fail-Safe Operations | PASS | All financial mutations wrapped in Postgres transactions with `SELECT FOR UPDATE` row locking. Failure rolls back everything. |
| III | Auditability | PASS | `audit_logs` table captures every critical action with actor, action, target, timestamp, and outcome. |
| IV | Backend-Enforced Validation | PASS | All validation and authorization in server actions / route handlers. Client validation is UX-only. |
| V | User Experience Quality | PASS | Mobile-first responsive design. All critical flows handle loading, success, error, empty, and disabled states. Duplicate submission prevention via UI guards and server-side idempotency. |
| VI | Testing Discipline | PASS | Playwright E2E for all critical user journeys. Vitest for business logic, validation, state transitions. |
| VII | Simplicity and Maintainability | PASS | Single Next.js project (no monorepo overhead). Domain services centralize business rules. Shared UI component library. No speculative abstractions. |
| VIII | Documentation and AI Discipline | PASS | Plan, spec, constitution are source of truth. Assumptions documented in spec and plan. |

**Pre-design gate result: ALL PASS — proceed to Phase 0.**

### Post-Design Re-Check (after Phase 1)

| # | Principle | Status | Verification |
|---|-----------|--------|-------------|
| I | Financial Integrity | PASS | Data model uses `bigint` for all `*_cents` columns. `CHECK >= 0` on balances. `CHECK > 0 AND <= 1000000` on amounts. No float usage anywhere in design. |
| II | Atomic Operations | PASS | Research decision #1 confirms Postgres functions via `rpc()` with `SELECT FOR UPDATE`. All financial mutations in single transactions. Rollback on any failure. |
| III | Auditability | PASS | `audit_logs` entity defined with actor, action, target_type, target_id, metadata, outcome, timestamp. Created within the mutation transaction. Append-only policy. |
| IV | Backend Validation | PASS | API contracts define server-side validation for every action. Zod schemas shared for UX only. Authorization checked before every mutation. |
| V | UX Quality | PASS | Section 12 covers all five states (loading, success, error, empty, disabled). Mobile-first from 320px. Duplicate prevention via UI guards + `SELECT FOR UPDATE`. |
| VI | Testing Discipline | PASS | Section 13 defines 7 Playwright E2E suites and 5 Vitest unit suites covering all critical paths. |
| VII | Simplicity | PASS | Single Next.js project. Five domain services. Shared UI library. No speculative abstractions. No Complexity Tracking entries needed. |
| VIII | Documentation | PASS | Plan, research, data model, API contracts, and quickstart all generated. All assumptions documented in plan section 14 and spec. |

**Post-design gate result: ALL PASS — design is constitution-compliant.**

## Project Structure

### Documentation (this feature)

```text
specs/001-p2p-payment-requests/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md           # API route handler contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/                    # Route group for authenticated pages
│   │   ├── dashboard/
│   │   │   └── page.tsx           # Dashboard with incoming/outgoing tabs
│   │   ├── requests/
│   │   │   ├── new/
│   │   │   │   └── page.tsx       # Create request form
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Request detail (auth'd view)
│   │   ├── wallet/
│   │   │   └── page.tsx           # Wallet overview + top-up
│   │   └── settings/
│   │       └── page.tsx           # Bank account management
│   ├── pay/
│   │   └── [token]/
│   │       └── page.tsx           # Public payment page (no auth required)
│   ├── api/
│   │   ├── requests/
│   │   │   └── route.ts           # GET: list requests (with search/filter)
│   │   ├── pay-guest/
│   │   │   └── route.ts           # POST: guest payment (rate-limited)
│   │   └── bank-guest/
│   │       └── route.ts           # POST: guest bank connection (rate-limited)
│   ├── layout.tsx
│   └── page.tsx                   # Landing / redirect to dashboard
├── components/
│   ├── ui/                        # Shared UI primitives
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── modal.tsx
│   │   ├── badge.tsx
│   │   ├── spinner.tsx
│   │   ├── empty-state.tsx
│   │   └── error-message.tsx
│   ├── requests/                  # Request-specific components
│   │   ├── request-card.tsx
│   │   ├── request-list.tsx
│   │   ├── request-detail.tsx
│   │   ├── request-form.tsx
│   │   ├── request-status-badge.tsx
│   │   ├── expiration-countdown.tsx
│   │   └── shareable-link.tsx
│   ├── payment/                   # Payment flow components
│   │   ├── funding-source-selector.tsx
│   │   ├── payment-confirmation.tsx
│   │   └── guest-payment-flow.tsx
│   ├── wallet/
│   │   ├── wallet-balance.tsx
│   │   └── top-up-form.tsx
│   └── bank/
│       ├── bank-connect-flow.tsx
│       └── bank-account-card.tsx
├── lib/
│   ├── services/                  # Domain services (business logic)
│   │   ├── request-service.ts
│   │   ├── payment-service.ts
│   │   ├── wallet-service.ts
│   │   ├── bank-service.ts
│   │   └── audit-service.ts
│   ├── actions/                   # Next.js Server Actions
│   │   ├── request-actions.ts
│   │   ├── payment-actions.ts
│   │   ├── wallet-actions.ts
│   │   └── bank-actions.ts
│   ├── validators/                # Shared validation schemas
│   │   ├── request-validators.ts
│   │   ├── payment-validators.ts
│   │   └── common-validators.ts
│   ├── db/                        # Database utilities
│   │   ├── client.ts              # Supabase admin client (server-side)
│   │   └── transactions.ts        # Transaction helper
│   ├── supabase/                  # Supabase client configuration
│   │   ├── server.ts              # Server-side Supabase client
│   │   ├── client.ts              # Browser-side Supabase client
│   │   └── middleware.ts          # Auth middleware
│   ├── constants.ts               # App-wide constants
│   └── types/                     # Shared TypeScript types
│       ├── database.ts            # DB row types (generated or manual)
│       ├── domain.ts              # Domain types
│       └── api.ts                 # Request/response types
├── hooks/                         # Custom React hooks
│   ├── use-requests.ts
│   ├── use-wallet.ts
│   └── use-bank.ts
└── middleware.ts                  # Next.js middleware (auth redirect, public route detection)

supabase/
├── migrations/                    # SQL migration files
│   └── 001_initial_schema.sql
└── seed.sql                       # Seed data for development

tests/
├── e2e/                           # Playwright E2E tests
│   ├── create-request.spec.ts
│   ├── pay-with-wallet.spec.ts
│   ├── pay-with-bank.spec.ts
│   ├── decline-cancel.spec.ts
│   ├── public-payment.spec.ts
│   ├── wallet-topup.spec.ts
│   └── expiration.spec.ts
└── unit/                          # Vitest unit tests
    ├── services/
    │   ├── request-service.test.ts
    │   ├── payment-service.test.ts
    │   └── wallet-service.test.ts
    ├── validators/
    │   ├── request-validators.test.ts
    │   └── payment-validators.test.ts
    └── state-machine.test.ts
```

**Structure Decision**: Single Next.js project using App Router. The `(auth)` route group wraps authenticated pages with shared layout and auth middleware. Public routes (`/pay/[token]`) live outside this group. Domain logic lives in `lib/services/`, server mutations in `lib/actions/`, and API route handlers in `app/api/` only for guest endpoints that need rate limiting.

---

## 1. Architecture Overview

### High-Level System Structure

```
┌─────────────────────────────────────────────────────┐
│                   Client (Browser)                    │
│  Next.js React App (Server + Client Components)       │
│  Tailwind CSS responsive UI                           │
└────────────────────┬────────────────────────────────┘
                     │ Server Actions / Route Handlers
┌────────────────────▼────────────────────────────────┐
│              Next.js Server (Vercel)                  │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │   Actions    │ │Route Handlers│ │  Middleware   │  │
│  │ (mutations)  │ │ (guest API)  │ │  (auth)      │  │
│  └──────┬──────┘ └──────┬───────┘ └──────────────┘  │
│         │               │                            │
│  ┌──────▼───────────────▼──────┐                     │
│  │     Domain Services          │                     │
│  │  request · payment · wallet  │                     │
│  │  bank · audit                │                     │
│  └──────────────┬──────────────┘                     │
│                 │                                     │
│  ┌──────────────▼──────────────┐                     │
│  │     Validators               │                     │
│  └──────────────┬──────────────┘                     │
└─────────────────┼───────────────────────────────────┘
                  │ Supabase Client (postgres + auth)
┌─────────────────▼───────────────────────────────────┐
│              Supabase (Postgres)                      │
│  users · wallets · bank_accounts · payment_requests   │
│  payment_transactions · audit_logs                    │
│  + Row Level Security policies                        │
└─────────────────────────────────────────────────────┘
```

### Separation of Responsibilities

- **Client components**: Interactive UI (forms, modals, selectors), local state, optimistic UI hints.
- **Server components**: Data fetching, rendering pages with fresh data, passing data to client components.
- **Server actions**: All state-changing mutations. Validate, authorize, call domain services, return results.
- **Route handlers**: Guest-facing endpoints that need rate limiting (guest payment, guest bank connection). Also used for search/filter API for dashboard if needed.
- **Domain services**: Pure business logic. Accept validated inputs, execute within database transactions, return results. No HTTP concerns.
- **Validators**: Shared validation schemas used by both server actions and client-side forms (for UX).

### Key Boundaries

1. **Auth boundary**: Next.js middleware checks auth for `(auth)` routes. Public routes (`/pay/[token]`) bypass auth.
2. **Validation boundary**: Server actions/route handlers validate all input before calling services.
3. **Transaction boundary**: Domain services manage Postgres transactions. One transaction per mutation.
4. **Rate-limit boundary**: Applied at route handler level for guest endpoints.

---

## 2. Backend Design

### Responsibilities

The backend handles all validation, authorization, business rule enforcement, and data persistence. No client input is trusted.

### Server Actions vs. Route Handlers

| Concern | Mechanism | Reason |
|---------|-----------|--------|
| Create request | Server Action | Authenticated, form-driven |
| Pay request (auth'd) | Server Action | Authenticated, form-driven |
| Decline request | Server Action | Authenticated, single action |
| Cancel request | Server Action | Authenticated, single action |
| Connect bank account | Server Action | Authenticated, form-driven |
| Top up wallet | Server Action | Authenticated, form-driven |
| Guest payment | Route Handler (POST) | Needs rate limiting, no auth |
| Guest bank connection | Route Handler (POST) | Needs rate limiting, no auth |
| List requests (search/filter) | Route Handler (GET) | Supports query params, pagination |
| Fetch single request (public) | Server Component | Direct DB query from RSC |

### Server-Side Validation Strategy

1. Every server action and route handler validates input using shared validator functions.
2. Validators are defined in `lib/validators/` and reuse the same logic on the client (for UX) and server (for security).
3. Validation failures return structured error objects (`{ field, message }`).
4. Type-safe validation using Zod schemas.

### Authorization Strategy

1. Server actions extract the current user from the Supabase session.
2. Before any mutation, check: user exists, user is active, user has permission for the operation.
3. Request-specific authorization: only the recipient can pay/decline, only the requester can cancel.
4. Guest endpoints: no auth required, but rate-limited by IP.

### Domain Services

| Service | Responsibilities |
|---------|-----------------|
| `request-service` | Create request, validate recipient, generate shareable token, check expiration, enforce state transitions |
| `payment-service` | Process payment (wallet or bank), atomic balance transfer, duplicate prevention, guest payment |
| `wallet-service` | Get balance, top up from bank, credit from payment |
| `bank-service` | Connect mocked bank account, replace existing, validate bank balance |
| `audit-service` | Create audit log entries for all critical actions |

### Transaction Strategy

Every financial mutation follows this pattern:

```
BEGIN TRANSACTION
  1. SELECT ... FOR UPDATE (lock affected rows)
  2. Re-validate business rules (status, balance, expiration)
  3. Perform writes (update balances, status, create records)
  4. Create audit log entry
COMMIT (or ROLLBACK on any failure)
```

This is implemented via a `withTransaction` helper that wraps Supabase's `rpc` or raw SQL execution through Supabase's Postgres connection.

### Duplicate Payment Prevention

1. **Database level**: `SELECT FOR UPDATE` on the payment request row. Only one transaction can hold the lock; the second waits and finds the status already changed.
2. **UI level**: Disable the pay button immediately on click, show loading state.
3. **Idempotency**: Consider an optional `idempotency_key` column on `payment_transactions` with a unique constraint to guard against replayed requests.

### Public Request Access

1. Requests have a `share_token` (UUID v4) that forms the public URL: `/pay/{share_token}`.
2. The public page fetches request data by token (no auth required).
3. If a signed-in user opens a public link and is the recipient, middleware redirects to `/requests/{id}`.
4. Non-pending requests render as read-only on the public page.

---

## 3. Data Model Design

> Full entity definitions in [data-model.md](./data-model.md).

### Entity Relationship Summary

```
users 1──1 wallets
users 1──0..1 bank_accounts
users 1──* payment_requests (as requester)
payment_requests *──* users (recipients matched dynamically by contact)
payment_requests 1──0..1 payment_transactions
payment_transactions *──1 audit_logs
payment_requests *──* audit_logs
```

### Core Entities

**users** — Extends Supabase `auth.users`. Stores profile info (display name, email, phone, status).

**wallets** — One per user. Stores `balance_cents` (bigint, default 0, >= 0).

**bank_accounts** — Zero or one per user. Stores mocked bank metadata and `balance_cents`.

**payment_requests** — The central entity. Stores requester, recipient contact, amount, status, share token, expiration.

**payment_transactions** — Records every financial movement (payment, top-up). Links to request or wallet action.

**audit_logs** — Structured log of every critical action. Immutable append-only.

---

## 4. Request Lifecycle and State Machine

### Statuses

| Status | Description | Terminal? |
|--------|-------------|-----------|
| `pending` | Awaiting action from recipient | No |
| `paid` | Successfully paid | Yes |
| `declined` | Recipient declined | Yes |
| `canceled` | Requester canceled | Yes |
| `expired` | 7 days elapsed without action | Yes |

### Valid Transitions

```
pending → paid       (recipient pays)
pending → declined   (recipient declines)
pending → canceled   (requester cancels)
pending → expired    (system/query-time check)
```

All other transitions are forbidden. Attempting an invalid transition returns an error.

### State Transition Enforcement

Implemented in `request-service.ts`:

```typescript
const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending: ['paid', 'declined', 'canceled', 'expired'],
  paid: [],
  declined: [],
  canceled: [],
  expired: [],
};
```

Before any state change, the service:
1. Locks the request row (`SELECT FOR UPDATE`)
2. Checks current status is `pending`
3. Checks the request is not expired (`expires_at > now()`)
4. Validates the actor has permission for the transition
5. Updates the status

### Expiration Behavior

- `expires_at` is set at creation time: `created_at + interval '7 days'`.
- Expiration is checked **lazily at query time**: any query or action checks `expires_at` against the current time.
- If a request is pending but past its `expires_at`, it is treated as expired.
- A database view or computed column can present `effective_status` that accounts for expiration.
- No background cron job is needed for MVP — lazy evaluation is simpler and sufficient.
- Actions on expired requests are rejected with a clear "request expired" message.

---

## 5. Payment Processing Flow

### Wallet Payment Flow

1. User selects "Wallet" as funding source and confirms.
2. Server action receives `{ requestId, fundingSource: 'wallet' }`.
3. **Validate**: request exists, status is pending, not expired, user is recipient.
4. **Begin transaction**:
   - Lock request row (`SELECT FOR UPDATE`)
   - Re-check status is `pending` and not expired
   - Lock payer wallet row (`SELECT FOR UPDATE`)
   - Verify `payer_wallet.balance_cents >= request.amount_cents`
   - Decrement payer wallet: `balance_cents -= amount_cents`
   - Lock requester wallet row (`SELECT FOR UPDATE`)
   - Increment requester wallet: `balance_cents += amount_cents`
   - Update request status to `paid`, set `paid_at = now()`
   - Insert `payment_transactions` record
   - Insert `audit_logs` entry
5. **Commit** — all changes visible atomically.
6. Return success to client.

### Mock Bank Payment Flow

Same as wallet flow, except:
- Funding source is the payer's bank account.
- Step 4 locks the bank account row instead of (or in addition to) wallet.
- Decrements `bank_accounts.balance_cents` instead of payer wallet.
- Requester wallet is still credited.

### Guest Payment Flow

1. Guest completes inline bank connection (creates a temporary/guest bank record).
2. Guest confirms payment with the connected bank.
3. Route handler receives `{ shareToken, bankDetails }`.
4. Same atomic transaction as bank payment, but:
   - No auth check (guest).
   - Rate-limited by IP.
   - Guest bank account balance is validated and decremented.
   - Requester wallet is credited.
5. Guest bank record can be ephemeral (created and used within the transaction).

### Failure Handling

- Any failure within the transaction triggers a full rollback.
- The request remains in `pending` status.
- All balances remain unchanged.
- The user sees a clear error message.
- They can retry the payment.

### Idempotency

- Primary guard: `SELECT FOR UPDATE` + status check. If status is already `paid`, the transaction short-circuits with a "already paid" message.
- Secondary guard: UI disables the button on click.

---

## 6. Wallet and Balance Management

### Balance Storage

- Each user has exactly one wallet with a `balance_cents` (bigint) field.
- Wallet is created automatically when the user profile is created (default balance: 0).
- `CHECK (balance_cents >= 0)` constraint prevents negative balances.

### Incoming Funds

When a payment request is paid, the requester's wallet `balance_cents` is incremented by `amount_cents` within the same transaction.

### Top-Up Flow

1. User enters a top-up amount and selects their connected bank account.
2. Server action validates: user has a connected bank, bank has sufficient balance, amount > 0.
3. **Transaction**:
   - Lock bank account row
   - Verify `bank.balance_cents >= amount_cents`
   - Decrement bank: `balance_cents -= amount_cents`
   - Lock wallet row
   - Increment wallet: `balance_cents += amount_cents`
   - Insert `payment_transactions` record (type: `top_up`)
   - Insert `audit_logs` entry
4. Commit.

### Consistency

- Balances are only modified within transactions.
- `CHECK` constraints prevent negative balances at the database level.
- The `payment_transactions` table provides a full ledger that can be reconciled against wallet/bank balances.

---

## 7. Public Request and Guest Payment Flow

### Shareable Link

- Each request gets a `share_token` (UUID v4) at creation time.
- Public URL pattern: `/pay/{share_token}`
- Token is non-guessable (128 bits of randomness).
- Indexed in the database for fast lookup.

### Public Page Behavior

| Request State | Page Behavior |
|--------------|---------------|
| Pending | Show details + guest payment option |
| Paid | Read-only with "paid" status |
| Declined | Read-only with "declined" status |
| Canceled | Read-only with "canceled" status |
| Expired | Read-only with "expired" status |
| Not found | 404 "not found" message |

### Signed-In User Redirect

Next.js middleware checks:
1. Is the user signed in?
2. Is the URL a `/pay/[token]` route?
3. Is the signed-in user the recipient of this request?

If all true, redirect to `/requests/{id}` (authenticated detail view with full capabilities).

### Guest Bank Connection

- The guest goes through a simulated bank connection inline on the public page.
- A temporary bank record is created (not linked to any user, marked as guest).
- The bank record is used for the payment transaction and can be soft-deleted after.

### Rate Limiting

- IP-based rate limiting on `POST /api/pay-guest` and `POST /api/bank-guest`.
- Implementation: simple in-memory rate limiter or Vercel's built-in rate limiting headers.
- Limits: e.g., 10 requests per IP per minute.

---

## 8. API Design

> Full contracts in [contracts/api.md](./contracts/api.md).

### Server Actions (Authenticated)

| Action | Input | Output | Auth |
|--------|-------|--------|------|
| `createRequest` | `{ recipientType, recipientValue, amountCents, note? }` | `{ request, shareUrl }` | Required (active user) |
| `payRequest` | `{ requestId, fundingSource, fundingSourceId? }` | `{ transaction }` | Required (recipient) |
| `declineRequest` | `{ requestId }` | `{ request }` | Required (recipient) |
| `cancelRequest` | `{ requestId }` | `{ request }` | Required (requester) |
| `connectBankAccount` | `{ bankName, accountNumber }` | `{ bankAccount }` | Required (active user) |
| `topUpWallet` | `{ amountCents, bankAccountId }` | `{ transaction }` | Required (active user) |

### Route Handlers (Guest / Query)

| Endpoint | Method | Input | Output | Auth |
|----------|--------|-------|--------|------|
| `/api/requests` | GET | `?tab, status, search, page` | `{ requests, total }` | Required |
| `/api/pay-guest` | POST | `{ shareToken, bankDetails }` | `{ transaction }` | None (rate-limited) |
| `/api/bank-guest` | POST | `{ bankName, accountNumber }` | `{ guestBankId }` | None (rate-limited) |

### Error Response Format

```typescript
{
  error: {
    code: string;       // e.g., "INSUFFICIENT_BALANCE", "REQUEST_EXPIRED"
    message: string;    // Human-readable message
    field?: string;     // For validation errors
  }
}
```

---

## 9. Frontend Structure

### Pages and Routing

| Route | Page | Auth | Description |
|-------|------|------|-------------|
| `/` | Landing | No | Redirect to dashboard if signed in |
| `/dashboard` | Dashboard | Yes | Incoming/outgoing request tabs |
| `/requests/new` | Create Request | Yes | Request creation form |
| `/requests/[id]` | Request Detail | Yes | Full detail + actions |
| `/wallet` | Wallet | Yes | Balance overview + top-up |
| `/settings` | Settings | Yes | Bank account management |
| `/pay/[token]` | Public Payment | No | Public request page + guest payment |

### Component Hierarchy

```
Layout (auth check, nav)
├── Dashboard Page
│   ├── Tab Selector (incoming / outgoing)
│   ├── Search + Filter Bar
│   ├── RequestList
│   │   └── RequestCard (repeated)
│   │       ├── RequestStatusBadge
│   │       └── ExpirationCountdown
│   └── EmptyState
├── Create Request Page
│   └── RequestForm
│       ├── Input (recipient type selector)
│       ├── Input (recipient value)
│       ├── Input (amount)
│       ├── Input (note)
│       └── Button (submit)
├── Request Detail Page
│   ├── RequestDetail
│   │   ├── RequestStatusBadge
│   │   ├── ExpirationCountdown
│   │   └── ShareableLink
│   ├── FundingSourceSelector (if recipient + pending)
│   ├── PaymentConfirmation (modal)
│   └── Action Buttons (pay / decline / cancel)
├── Wallet Page
│   ├── WalletBalance
│   ├── TopUpForm
│   └── BankAccountCard
├── Settings Page
│   └── BankConnectFlow
└── Public Payment Page
    ├── RequestDetail (read-only variant)
    ├── GuestPaymentFlow
    │   ├── BankConnectFlow (inline)
    │   └── PaymentConfirmation
    └── Read-Only Status Display
```

### State Management

- **Server data**: Fetched in server components, passed as props. Revalidated via `revalidatePath` after mutations.
- **Local state**: React `useState` for form inputs, modal visibility, loading states.
- **No global state library**: Server components + React state is sufficient for this scope.
- **Optimistic UI**: Use `useTransition` for server action calls to show pending states without blocking.

---

## 10. UI Reusability and Styling Strategy

### Shared UI Components

All common UI patterns are built once in `components/ui/` and reused everywhere:

- **Button**: Primary, secondary, danger, disabled, loading variants
- **Card**: Content container with optional header/footer
- **Input**: Text, number, tel, email — with label, error state, help text
- **Select**: Dropdown with label and error state
- **Modal**: Confirmation dialogs (payment, decline, cancel)
- **Badge**: Status indicators with color coding
- **Spinner**: Loading indicator
- **EmptyState**: Illustration + message + optional CTA
- **ErrorMessage**: Inline and toast error display

### Styling Approach

- **Tailwind CSS** as the primary styling mechanism. All component styling uses Tailwind utility classes.
- **Component-scoped styles**: Only use CSS modules for complex animations or pseudo-element patterns that are awkward in Tailwind.
- **Design tokens**: Define colors, spacing, and typography in `tailwind.config.ts` for consistency.
- **Responsive**: Mobile-first breakpoints (`sm`, `md`, `lg`). All layouts are responsive by default.
- **No duplication**: Extract repeated layout patterns (page wrappers, section headers, form layouts) into shared components.

---

## 11. Audit Logging Strategy

### When Audit Logs Are Created

| Event | Action Type | Actor |
|-------|------------|-------|
| Request created | `request.created` | Requester |
| Request paid | `request.paid` | Payer (user or guest) |
| Request declined | `request.declined` | Recipient |
| Request canceled | `request.canceled` | Requester |
| Request expired | `request.expired` | System |
| Wallet top-up | `wallet.top_up` | User |
| Bank account connected | `bank.connected` | User |
| Bank account replaced | `bank.replaced` | User |
| Payment failed | `payment.failed` | Payer |

### Audit Log Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `actor_id` | UUID (nullable) | User who performed action (null for guests/system) |
| `actor_type` | enum | `user`, `guest`, `system` |
| `action` | string | Action type (see above) |
| `target_type` | string | `payment_request`, `wallet`, `bank_account` |
| `target_id` | UUID | ID of affected entity |
| `metadata` | JSONB | Additional context (amount, funding source, error reason) |
| `outcome` | enum | `success`, `failure` |
| `created_at` | timestamp | When the event occurred |

### Relationships

- Audit logs reference the target entity (request, wallet, bank account) by `target_type` + `target_id`.
- They are created within the same transaction as the action they log.
- They are append-only and immutable.

---

## 12. Error Handling and UX States

### Backend Error Surfacing

1. Server actions return structured results: `{ success: true, data } | { success: false, error }`.
2. Error objects contain `code` (machine-readable) and `message` (human-readable).
3. Client components display errors contextually (inline for validation, toast for system errors).

### UX State Coverage

Every critical flow handles all five states:

| State | UI Treatment |
|-------|-------------|
| **Loading** | Spinner or skeleton, disabled controls |
| **Success** | Confirmation message, updated UI, navigation |
| **Error** | Inline error messages (validation), toast (system errors), retry option |
| **Empty** | Descriptive empty state with guidance (e.g., "No requests yet — create one!") |
| **Disabled** | Grayed-out controls with tooltip/text explaining why (e.g., "Connect a bank account first") |

### Duplicate Action Prevention

- **Pay button**: Disabled immediately on click. Shows loading spinner. Re-enabled only on error.
- **Form submissions**: `useTransition` provides `isPending` state to disable the form.
- **Server-side**: `SELECT FOR UPDATE` + status check prevents double payments even if two requests arrive.

---

## 13. Testing Strategy

### E2E Tests (Playwright)

| Test Suite | Scenarios |
|-----------|-----------|
| Create Request | Valid creation (email + phone), validation errors, self-request rejection, shareable link generation |
| Pay with Wallet | Successful payment, insufficient balance, already-paid rejection |
| Pay with Bank | Successful bank payment, insufficient bank balance |
| Decline & Cancel | Decline as recipient, cancel as requester, invalid role rejection, already-terminal rejection |
| Public Payment | Guest views pending request, guest pays via bank, guest views terminal request, invalid link |
| Wallet Top-Up | Successful top-up, insufficient bank balance, no bank connected |
| Expiration | Expired request blocks payment, expired status on dashboard and detail, countdown display |

### Unit Tests (Vitest)

| Test Suite | Focus |
|-----------|-------|
| Request Service | State transitions, validation, expiration check, self-request prevention |
| Payment Service | Balance checks, atomic operations, funding source selection |
| Wallet Service | Top-up validation, balance calculation |
| Validators | Email/phone format, amount bounds, note length |
| State Machine | All valid transitions, all invalid transitions |

### Test Infrastructure

- **Playwright**: Runs against a local Next.js dev server with a test Supabase instance. Uses seeded test data.
- **Vitest**: Tests domain services in isolation. Mocks database layer. Fast execution.
- **CI**: Both test suites run on every PR.

---

## 14. Assumptions and Trade-offs

### Explicit Simplifications

| Simplification | Rationale |
|---------------|-----------|
| Lazy expiration (no cron) | Simplicity. Query-time check is sufficient for MVP scale. |
| In-memory rate limiting | Adequate for single-instance Vercel deployment. No Redis needed. |
| No real-time updates | Spec explicitly states no WebSocket/SSE. Refresh-based updates. |
| One bank account per user | MVP constraint. Replace-on-reconnect is simpler than multi-bank management. |
| Guest bank records are ephemeral | No need to persist guest bank details beyond the transaction. |
| No notification system | Out of scope per spec non-goals. |
| Supabase Auth assumed pre-configured | Spec states auth exists. Plan does not design registration/login flows. |

### Constraints

- **Single currency (USD)**: All amounts in cents. No currency conversion.
- **No partial payments**: Full amount only.
- **Amount bounds**: Minimum $0.01 (1 cent), maximum $10,000.00 (1,000,000 cents).
- **Note length**: Maximum 250 characters.
- **Expiration**: Fixed at 7 days from creation.

### Not Implemented

- Push/email notifications
- Multi-currency
- Admin panel
- Dispute resolution
- Recurring requests
- Full WCAG 2.1 AA audit (best-effort accessibility)
- Internationalization

---

## Complexity Tracking

No Constitution violations requiring justification. All design decisions align with the eight principles.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | — | — |
