# Research: Currency-Safe Money Fields

**Feature**: 004-currency-safe-money  
**Date**: 2026-04-13

## R1: Column Rename Strategy in Postgres

**Decision**: Use `ALTER TABLE ... RENAME COLUMN` within a single transactional migration.

**Rationale**: Postgres supports `RENAME COLUMN` as a metadata-only operation (no table rewrite). It is fast even on large tables and fully transactional. `CHECK` constraints that reference the old column name are automatically updated to reference the new name. Views (`payment_requests_view`) that use `SELECT *` will reflect the renamed column automatically.

**Alternatives considered**:
- Add new columns + copy + drop old: Unnecessary complexity; `RENAME COLUMN` is sufficient and faster.
- Application-level aliasing (keep DB columns, alias in queries): Fragile; splits truth between DB and app.

## R2: Adding a NOT NULL Column With Default to Existing Tables

**Decision**: Add `currency TEXT NOT NULL DEFAULT 'USD'` in the same migration after renaming columns. Postgres 11+ treats `DEFAULT` for new `NOT NULL` columns as a metadata-only operation — no table rewrite.

**Rationale**: Adding a `NOT NULL` column with a `DEFAULT` value on Postgres 11+ is instant regardless of row count. The default covers backfill automatically — every existing row reads `'USD'` without an explicit `UPDATE`. A `CHECK (currency ~ '^[A-Z]{3}$')` constraint validates format.

**Alternatives considered**:
- Add nullable, backfill, then set NOT NULL: More migration steps, same result. Needed for Postgres < 11 but not for Supabase (Postgres 15).
- Use an ENUM type: Rigid; adding currencies requires a migration. A TEXT + CHECK is more flexible and the `SUPPORTED_CURRENCIES` array handles app-level validation.

## R3: RPC Function Update Strategy

**Decision**: `CREATE OR REPLACE FUNCTION` in the same migration. Since the functions use `%ROWTYPE`, the row types will reflect renamed columns after the rename, but the functions reference columns by name in DML, so they must be rewritten.

**Rationale**: The existing `process_payment` and `process_top_up` functions reference `balance_cents` and `amount_cents` in `SELECT`, `UPDATE`, and `INSERT` statements. After column rename these become invalid. Replacing the functions in the same migration ensures atomicity.

**Specific changes**:
- `process_payment`: All `balance_cents` → `balance_minor`, all `amount_cents` → `amount_minor`. Audit log JSON key changes from `amount_cents` to `amount_minor`. The `payment_transactions` insert adds `currency` derived from the request's `currency`.
- `process_top_up`: Parameter `p_amount_cents` → `p_amount_minor`. All column references updated. Audit log JSON key updated. Transaction insert adds currency from the wallet's `currency`.
- `handle_new_user` (from 003_auto_create_profile.sql): The trigger function references `balance_cents` in its INSERT. Must be replaced to use `balance_minor`. Without this fix, new user signups will fail after the column rename.
- Function signatures change (parameter rename for `process_top_up`), so `REVOKE`/`GRANT` statements must be re-issued for the new signature.

**Alternatives considered**:
- Separate migration for RPCs: Adds ordering risk; same-transaction is simpler and safer.

## R4: ISO 4217 Minor-Unit Exponent Map

**Decision**: Hardcoded TypeScript `Record<string, number>` mapping currency codes to their minor-unit exponent (e.g., `{ USD: 2, EUR: 2, JPY: 0, KWD: 3, TRY: 2 }`). Placed in `constants.ts` alongside `SUPPORTED_CURRENCIES`.

**Rationale**: The map is small, static, and rarely changes. ISO 4217 exponents are standardized. Using a lookup map is simpler than importing a currency library and keeps the dependency footprint minimal. The formatter divides by `10^exponent`; the parser multiplies by `10^exponent`.

**Alternatives considered**:
- Use a library like `currency.js` or `dinero.js`: Adds a dependency for a single lookup. Overkill when only the exponent is needed.
- Derive from `Intl.NumberFormat`: Not reliably possible — `Intl` gives formatting but not the raw exponent.
- Store exponent in the database: Unnecessary; the exponent is a property of the currency code, not of the data.

## R5: Supported Currencies Validation

**Decision**: `SUPPORTED_CURRENCIES = ['USD'] as const` in `constants.ts`. A Zod schema `currencySchema` validates against this array. Application-level validation rejects unsupported codes before they reach the database.

**Rationale**: Simplest approach for a single-currency app. Easy to extend by adding to the array. Easy to test. Can be promoted to a database table later.

**Alternatives considered**:
- Database table: Runtime-manageable but adds query overhead and migration for what's currently a single entry.
- Environment variable: Adds deployment complexity without clear benefit.

## R6: Seed and Test Data Migration

**Decision**: Update `seed.sql` in-place — rename columns and add `currency = 'USD'` to all inserts. Update test fixtures (`global-setup.ts`, `wallet-topup.spec.ts`) similarly. E2E tests that only assert displayed strings (`$50.00`) need no changes.

**Rationale**: Seed data and test fixtures are not production data — they can be edited directly. The column rename in seeds must match the schema.

## Summary of Resolved Unknowns

| Unknown | Resolution |
|---------|------------|
| Column rename mechanism | `ALTER TABLE ... RENAME COLUMN` (metadata-only) |
| NOT NULL + DEFAULT addition | Postgres 11+ instant add; no backfill UPDATE needed |
| RPC update strategy | `CREATE OR REPLACE` in same migration |
| Exponent map location | `constants.ts` hardcoded `Record<string, number>` |
| Supported currency list | `constants.ts` hardcoded array |
| Seed/test update | In-place edit |
