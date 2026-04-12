# Quickstart: Currency-Safe Money Fields

**Feature**: 004-currency-safe-money  
**Date**: 2026-04-13

## Prerequisites

- Node.js 18+, npm
- Supabase CLI (`npx supabase`)
- Local Supabase instance running (`npx supabase start`)
- Environment variables in `.env.local`

## Migration

After implementing the changes, apply the migration:

```bash
npx supabase db reset
```

This re-runs all migrations (001–004) and the seed file from scratch on the local database.

For a running local database (incremental):

```bash
npx supabase migration up
```

## Verify Migration

```sql
-- Check column rename
SELECT column_name FROM information_schema.columns
WHERE table_name = 'wallets' AND column_name IN ('balance_minor', 'balance_cents');

-- Check currency column exists with correct default
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'wallets' AND column_name = 'currency';

-- Check constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.wallets'::regclass AND contype = 'c';
```

## Run Tests

```bash
# Unit tests
npm test

# E2E tests (requires dev server running)
npm run dev &
npx playwright test
```

## Key Files Changed

| Layer | Key File | Change |
|-------|----------|--------|
| Migration | `supabase/migrations/004_currency_safe_money.sql` | Schema rename + currency column + RPC updates |
| Seed | `supabase/seed.sql` | Column names + currency values |
| Types | `src/lib/types/database.ts`, `api.ts` | `*_cents` → `*_minor`, add `currency` |
| Constants | `src/lib/constants.ts` | Rename constants, add `SUPPORTED_CURRENCIES`, `CURRENCY_EXPONENTS` |
| Utils | `src/lib/utils.ts` | `formatCents` → `formatMinor`, `parseAmountToCents` → `parseAmountToMinor` |
| Validators | `src/lib/validators/common-validators.ts` | `amountCentsSchema` → `amountMinorSchema`, add `currencySchema` |
| Services | `src/lib/services/*.ts` | All money field references updated |
| Actions | `src/lib/actions/*.ts` | All money field references updated |
| API | `src/app/api/*/route.ts` | All money field references updated |
| UI | `src/components/**/*.tsx`, pages | `formatCents` → `formatMinor` with currency param |
| Tests | `tests/**/*.ts` | Money field references updated |

## Smoke Test Checklist

1. Dashboard loads and shows wallet balance formatted as `$X.XX`
2. Create a payment request — amount displays correctly
3. Pay a request from wallet — balances update correctly
4. Pay a request from bank — balances update correctly
5. Top up wallet from bank — balance updates correctly
6. Public payment link displays amount correctly
