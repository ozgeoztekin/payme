# Data Model: Currency-Safe Money Fields

**Feature**: 004-currency-safe-money  
**Date**: 2026-04-13

## Entity Changes

### wallets

| Column | Before | After | Notes |
|--------|--------|-------|-------|
| `balance_cents` | `bigint NOT NULL DEFAULT 0 CHECK (balance_cents >= 0)` | — | REMOVED (renamed) |
| `balance_minor` | — | `bigint NOT NULL DEFAULT 0 CHECK (balance_minor >= 0)` | RENAMED from `balance_cents` |
| `currency` | — | `text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$')` | NEW |

### bank_accounts

| Column | Before | After | Notes |
|--------|--------|-------|-------|
| `balance_cents` | `bigint NOT NULL CHECK (balance_cents >= 0)` | — | REMOVED (renamed) |
| `balance_minor` | — | `bigint NOT NULL CHECK (balance_minor >= 0)` | RENAMED from `balance_cents` |
| `currency` | — | `text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$')` | NEW |

### payment_requests

| Column | Before | After | Notes |
|--------|--------|-------|-------|
| `amount_cents` | `bigint NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 1000000)` | — | REMOVED (renamed) |
| `amount_minor` | — | `bigint NOT NULL CHECK (amount_minor > 0 AND amount_minor <= 1000000)` | RENAMED from `amount_cents` |
| `currency` | — | `text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$')` | NEW |

### payment_transactions

| Column | Before | After | Notes |
|--------|--------|-------|-------|
| `amount_cents` | `bigint NOT NULL CHECK (amount_cents > 0)` | — | REMOVED (renamed) |
| `amount_minor` | — | `bigint NOT NULL CHECK (amount_minor > 0)` | RENAMED from `amount_cents` |
| `currency` | — | `text NOT NULL DEFAULT 'USD' CHECK (currency ~ '^[A-Z]{3}$')` | NEW |

### audit_logs (unchanged)

No schema changes. Existing `metadata` JSON keys (`amount_cents`, `balance_cents`) are historical and preserved. New audit entries will use `amount_minor` / `balance_minor` keys in JSON — this is application-level, not schema-level.

## TypeScript Type Changes

### database.ts

```typescript
export interface WalletRow {
  id: string;
  user_id: string;
  balance_minor: number;  // was balance_cents
  currency: string;       // NEW
  created_at: string;
  updated_at: string;
}

export interface BankAccountRow {
  id: string;
  user_id: string | null;
  bank_name: string;
  account_number_masked: string;
  balance_minor: number;  // was balance_cents
  currency: string;       // NEW
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRequestRow {
  id: string;
  requester_id: string;
  recipient_type: 'email' | 'phone';
  recipient_value: string;
  amount_minor: number;   // was amount_cents
  currency: string;       // NEW
  note: string | null;
  status: 'pending' | 'paid' | 'declined' | 'canceled' | 'expired';
  share_token: string;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
}

export interface PaymentTransactionRow {
  id: string;
  type: 'payment' | 'top_up';
  request_id: string | null;
  payer_id: string | null;
  recipient_id: string;
  amount_minor: number;   // was amount_cents
  currency: string;       // NEW
  funding_source_type: 'wallet' | 'bank_account';
  funding_source_id: string;
  status: 'completed' | 'failed';
  created_at: string;
}
```

### api.ts

```typescript
export interface CreateRequestInput {
  recipientType: 'email' | 'phone';
  recipientValue: string;
  amountMinor: number;    // was amountCents
  currency: string;       // NEW
  note?: string;
}

export interface TopUpWalletInput {
  amountMinor: number;    // was amountCents
}

export interface PaymentRequestListItem {
  id: string;
  requester_id: string;
  requester_display_name: string;
  recipient_type: 'email' | 'phone';
  recipient_value: string;
  amount_minor: number;   // was amount_cents
  currency: string;       // NEW
  note: string | null;
  effective_status: RequestListEffectiveStatus;
  share_token: string;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
}
```

## RPC Function Signature Changes

### process_payment

No parameter rename — amount is derived from the request row. Internal column references change:

- `v_req.amount_cents` → `v_req.amount_minor`
- `balance_cents` → `balance_minor` (in all `SELECT`, `UPDATE` statements)
- `payment_transactions` insert adds `currency` column, value from `v_req.currency`
- Audit log JSON: `'amount_cents'` key → `'amount_minor'`

### process_top_up

Parameter rename: `p_amount_cents` → `p_amount_minor`

- Error message: `'invalid amount_cents'` → `'invalid amount_minor'`
- `balance_cents` → `balance_minor` (in all statements)
- `payment_transactions` insert adds `currency` column, value from `v_wallet.currency`
- Audit log JSON: `'amount_cents'` key → `'amount_minor'`
- Function signature changes require re-issuing `REVOKE`/`GRANT`

### handle_new_user (trigger from 003_auto_create_profile.sql)

- `INSERT INTO public.wallets (user_id, balance_cents)` → `INSERT INTO public.wallets (user_id, balance_minor)`
- Must be replaced in migration 004 or new user signups will fail after column rename

## Validation Rules

### Database-Level

- `currency ~ '^[A-Z]{3}$'` — enforces ISO 4217 format (3 uppercase letters)
- `currency NOT NULL DEFAULT 'USD'` — transitional default
- Existing CHECK constraints on `amount_minor` / `balance_minor` preserved (auto-renamed by Postgres)

### Application-Level

- `SUPPORTED_CURRENCIES = ['USD'] as const` — gates allowed currencies
- `currencySchema = z.enum(SUPPORTED_CURRENCIES)` — Zod validation
- `amountMinorSchema` — renamed from `amountCentsSchema`, same integer min/max rules
- Cross-currency rejection: funding source `currency` must match request `currency`

## Constants Changes

| Before | After |
|--------|-------|
| `AMOUNT_MIN_CENTS = 1` | `AMOUNT_MIN_MINOR = 1` |
| `AMOUNT_MAX_CENTS = 1_000_000` | `AMOUNT_MAX_MINOR = 1_000_000` |
| `MOCKED_BANK_BALANCE_CENTS = 1_000_000` | `MOCKED_BANK_BALANCE_MINOR = 1_000_000` |
| — | `SUPPORTED_CURRENCIES = ['USD'] as const` (NEW) |
| — | `DEFAULT_CURRENCY = 'USD'` (NEW) |
| — | `CURRENCY_EXPONENTS: Record<string, number>` (NEW) |

## Formatting Utility Changes

### formatMinor (was formatCents)

```
formatMinor(minorUnits: number, currency: string): string
```

- Looks up exponent from `CURRENCY_EXPONENTS` map
- Divides `minorUnits` by `10^exponent`
- Uses `Intl.NumberFormat` with the given `currency` code

### parseAmountToMinor (was parseAmountToCents)

```
parseAmountToMinor(value: string, currency: string): number
```

- Looks up exponent from `CURRENCY_EXPONENTS` map
- Multiplies parsed dollar value by `10^exponent`
- Returns integer via `Math.round`
