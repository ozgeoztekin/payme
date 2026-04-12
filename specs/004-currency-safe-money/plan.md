# Implementation Plan: Currency-Safe Money Fields

**Branch**: `004-currency-safe-money` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-currency-safe-money/spec.md`

## Summary

Rename all `*_cents` money columns to `*_minor`, add a `NOT NULL DEFAULT 'USD'` `currency` column to every money-bearing table, update RPC functions, and propagate the rename + currency through every layer of the stack: TypeScript types, services, actions, API routes, validators, constants, formatting utilities, UI components, seed data, and tests. The formatter and parser become exponent-aware using an ISO 4217 lookup map. A hardcoded `SUPPORTED_CURRENCIES` array gates application-level currency validation.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Next.js 15 (App Router), React 19, Supabase (Auth + Postgres), Tailwind CSS 4, Zod  
**Storage**: Supabase Postgres (hosted) — tables: `wallets`, `bank_accounts`, `payment_requests`, `payment_transactions`, `audit_logs`  
**Testing**: Playwright (E2E), Vitest (unit)  
**Target Platform**: Responsive web application  
**Project Type**: Web application (Next.js full-stack)  
**Performance Goals**: N/A — schema rename, no new performance targets  
**Constraints**: All money values as integer minor units; all financial mutations atomic via Postgres transactions  
**Scale/Scope**: 4 tables renamed, 3 functions rewritten (2 RPCs + 1 trigger), ~50 source files updated

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Financial Integrity | PASS | Money remains integer minor units. Rename preserves values. Currency column makes denomination explicit. |
| II. Atomic and Fail-Safe | PASS | Migration runs in a single transaction. RPC functions remain atomic. |
| III. Auditability | PASS | Existing audit JSON preserved as history. New entries use `*_minor` naming. |
| IV. Backend-Enforced Validation | PASS | Currency validated at DB level (CHECK constraint) and application level (`SUPPORTED_CURRENCIES`). |
| V. User Experience Quality | PASS | Formatting utility becomes currency-aware. No UX degradation for existing USD data. |
| VI. Testing Discipline | PASS | All E2E and unit tests updated. New unit tests for exponent-aware formatter. |
| VII. Simplicity and Maintainability | PASS | Hardcoded currency list is simplest viable approach. ISO 4217 exponent map is a small static lookup. |
| VIII. Documentation and AI Discipline | PASS | Exponent assumptions documented in code comments. Migration strategy documented in spec assumptions. |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/004-currency-safe-money/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
supabase/
├── migrations/
│   ├── 001_initial_schema.sql       # existing — unchanged
│   ├── 002_rpc_functions.sql        # existing — unchanged
│   ├── 003_auto_create_profile.sql  # existing — unchanged
│   └── 004_currency_safe_money.sql  # NEW — rename columns, add currency, update RPCs, replace handle_new_user trigger
└── seed.sql                         # MODIFY — *_cents → *_minor, add currency values

src/
├── lib/
│   ├── constants.ts                 # MODIFY — rename AMOUNT_MIN_CENTS etc., add SUPPORTED_CURRENCIES + ISO 4217 exponent map
│   ├── utils.ts                     # MODIFY — formatCents → formatMinor, parseAmountToCents → parseAmountToMinor (exponent-aware)
│   ├── types/
│   │   ├── database.ts              # MODIFY — *_cents → *_minor, add currency field
│   │   └── api.ts                   # MODIFY — amountCents → amountMinor, add currency field
│   ├── validators/
│   │   └── common-validators.ts     # MODIFY — amountCentsSchema → amountMinorSchema, add currencySchema
│   ├── db/
│   │   └── transactions.ts          # MODIFY — amountCents → amountMinor, p_amount_cents → p_amount_minor
│   ├── services/
│   │   ├── request-service.ts       # MODIFY — amount_cents → amount_minor, add currency
│   │   ├── wallet-service.ts        # MODIFY — balance_cents → balance_minor, p_amount_cents → p_amount_minor
│   │   ├── bank-service.ts          # MODIFY — balance_cents → balance_minor, add currency
│   │   └── profile-service.ts       # MODIFY — balance_cents → balance_minor, add currency
│   └── actions/
│       ├── wallet-actions.ts        # MODIFY — balance_cents → balance_minor, amountCents → amountMinor
│       ├── payment-actions.ts       # MODIFY — amount_cents → amount_minor, balance_cents → balance_minor
│       └── request-actions.ts       # MODIFY — amountCents → amountMinor
├── app/
│   ├── api/
│   │   ├── requests/route.ts        # MODIFY — amount_cents → amount_minor, add currency
│   │   ├── pay-guest/route.ts       # MODIFY — balance_cents → balance_minor, amount_cents → amount_minor
│   │   └── bank-guest/route.ts      # MODIFY — balance_cents → balance_minor, add currency
│   ├── (auth)/
│   │   ├── dashboard/page.tsx       # MODIFY — formatCents → formatMinor, balance_cents → balance_minor
│   │   ├── wallet/page.tsx          # MODIFY — pass currency to formatMinor
│   │   └── requests/
│   │       ├── new/page.tsx         # MODIFY — amountCents → amountMinor
│   │       └── [id]/request-payment-flow.tsx  # MODIFY — amount_cents → amount_minor, balance_cents → balance_minor
│   └── pay/[token]/page.tsx         # MODIFY — amount_cents → amount_minor, amountCents → amountMinor
├── components/
│   ├── wallet/
│   │   ├── wallet-balance.tsx       # MODIFY — formatCents → formatMinor, balance_cents → balance_minor
│   │   └── top-up-form.tsx          # MODIFY — amountCents → amountMinor
│   ├── bank/
│   │   └── bank-account-card.tsx    # MODIFY — formatCents → formatMinor, balance_cents → balance_minor
│   ├── requests/
│   │   ├── request-form.tsx         # MODIFY — AMOUNT_MIN_CENTS → AMOUNT_MIN_MINOR, amountCents → amountMinor
│   │   ├── request-card.tsx         # MODIFY — formatCents → formatMinor, amount_cents → amount_minor
│   │   └── request-detail.tsx       # MODIFY — formatCents → formatMinor, amount_cents → amount_minor
│   └── payment/
│       ├── funding-source-selector.tsx  # MODIFY — formatCents → formatMinor, balance_cents → balance_minor
│       ├── guest-payment-flow.tsx       # MODIFY — amountCents → amountMinor
│       └── payment-confirmation.tsx     # MODIFY — amountCents → amountMinor
└── hooks/
    ├── use-requests.ts              # MODIFY — if references *_cents
    └── use-wallet.ts                # MODIFY — if references *_cents

tests/
├── e2e/
│   ├── global-setup.ts             # MODIFY — balance_cents → balance_minor
│   ├── wallet-topup.spec.ts        # MODIFY — balance_cents → balance_minor
│   └── (other spec files)          # REVIEW — most assert UI strings ($50.00), no code changes expected
└── unit/
    ├── services/
    │   ├── wallet-service.test.ts   # MODIFY — p_amount_cents → p_amount_minor, balance_cents → balance_minor
    │   └── request-service.test.ts  # MODIFY — amount_cents → amount_minor
    └── validators/
        └── request-validators.test.ts  # MODIFY — amountCents → amountMinor
```

**Structure Decision**: Existing Next.js App Router structure maintained. No new directories. One new migration file. Constants module gains `SUPPORTED_CURRENCIES` and `CURRENCY_EXPONENTS` map.

## Complexity Tracking

No constitution violations — table empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none)    |            |                                     |
