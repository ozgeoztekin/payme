# Feature Specification: Currency-Safe Money Fields

**Feature Branch**: `004-currency-safe-money`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "Update the database schema and all related application usage to make money fields currency-safe and consistently named."

## Clarifications

### Session 2026-04-13

- Q: Should the `currency` column have a `DEFAULT 'USD'` or no default (strict enforcement)? → A: `DEFAULT 'USD'` as a transitional safety net. Application code must still always pass `currency` explicitly. The default will be removed in a future migration when multi-currency support ships.
- Q: How should the list of supported currencies be maintained? → A: Hardcoded array in a constants module (e.g., `SUPPORTED_CURRENCIES = ['USD']`). Simple, testable, and easy to promote to a database table later if runtime management is needed.
- Q: Should the formatter be minor-unit exponent-aware now or defer to multi-currency phase? → A: Exponent-aware now, using an ISO 4217 exponent lookup map. The exponent assumption must be documented with an explicit code comment in the formatter and parser utilities.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Minor-Unit Column Naming (Priority: P1)

As a developer working on PayMe, I need all money amount and balance columns renamed from `*_cents` to `*_minor` so that the naming is currency-agnostic and accurately represents that values are stored in the smallest currency unit — regardless of whether that unit is called "cents", "kuruş", or "pence."

**Why this priority**: This is the foundational rename upon which every other change depends. Without it, no other story can proceed safely. It also eliminates a naming assumption (USD cents) that becomes incorrect the moment a second currency is supported.

**Independent Test**: After migration, all database columns, application queries, TypeScript types, UI components, and tests reference `*_minor` instead of `*_cents`, and the application functions identically to before the rename.

**Acceptance Scenarios**:

1. **Given** the existing database has columns `amount_cents` and `balance_cents`, **When** the migration runs, **Then** all four tables use the renamed columns (`amount_minor` / `balance_minor`) and existing data values are preserved exactly.
2. **Given** a developer searches the codebase for `_cents`, **When** the search completes, **Then** zero matches are found in application code, types, queries, helpers, constants, seeds, or tests.
3. **Given** an end user is viewing the dashboard, wallet, or any payment screen, **When** the page loads after the rename, **Then** formatted dollar amounts display identically to before the change.

---

### User Story 2 - Explicit Currency on Every Money-Bearing Table (Priority: P1)

As a product owner, I need every table that stores a monetary value to also store the currency code so that values can never be misinterpreted when the platform supports multiple currencies in the future.

**Why this priority**: Equally critical to the rename — without an explicit currency column, a `balance_minor` of `5000` is ambiguous. Co-prioritized with Story 1 because the migration should ship atomically.

**Independent Test**: After migration, every row in `payment_requests`, `payment_transactions`, `wallets`, and `bank_accounts` has a valid ISO 4217 `currency` value, and all insert/update paths require it.

**Acceptance Scenarios**:

1. **Given** the migration runs against the existing database, **When** it completes, **Then** every existing row has `currency = 'USD'` (the current implicit default).
2. **Given** a new payment request is created, **When** the insert statement omits `currency`, **Then** the database rejects the insert (column is `NOT NULL`).
3. **Given** an insert supplies `currency = 'usd'` or `currency = 'US'`, **When** the constraint is evaluated, **Then** the insert is rejected because the value does not match the 3-letter uppercase pattern.

---

### User Story 3 - Currency-Aware Amount Formatting (Priority: P2)

As an end user viewing amounts in the UI, I need displayed values to use the correct currency symbol and formatting rules for the currency stored alongside each amount.

**Why this priority**: The current hard-coded USD formatter works today, but after adding a `currency` column the formatter must use it so the UI is truthful. This is lower priority than the data layer changes but required before multi-currency is meaningful.

**Independent Test**: A wallet with `currency = 'EUR'` displays amounts with the `€` symbol; a wallet with `currency = 'USD'` continues to display `$`; a wallet with `currency = 'TRY'` displays `₺`.

**Acceptance Scenarios**:

1. **Given** a wallet has `balance_minor = 5000` and `currency = 'USD'`, **When** the balance is displayed, **Then** the UI shows `$50.00`.
2. **Given** a payment request has `amount_minor = 1500` and `currency = 'EUR'`, **When** the amount is displayed, **Then** the UI shows `€15.00` (or locale-appropriate EUR formatting).
3. **Given** a transaction has `amount_minor = 25000` and `currency = 'TRY'`, **When** the amount is displayed, **Then** the UI shows `₺250.00` (or locale-appropriate TRY formatting).

---

### User Story 4 - Safe Data Migration With No Data Loss (Priority: P1)

As a system operator, I need existing production data to be migrated without data loss, downtime-sensitive failures, or broken references so that users see no disruption.

**Why this priority**: Data integrity during migration is non-negotiable for a financial application.

**Independent Test**: Run the migration on a copy of production data, then verify row counts, balance totals, and transaction sums are identical before and after.

**Acceptance Scenarios**:

1. **Given** the `wallets` table has 1,000 rows before migration, **When** the migration completes, **Then** 1,000 rows exist with identical `balance_minor` values (formerly `balance_cents`) and `currency = 'USD'`.
2. **Given** RPC functions `process_payment` and `process_top_up` reference old column names, **When** the migration completes, **Then** updated RPC functions reference `amount_minor` / `balance_minor` and execute successfully.
3. **Given** a migration is run and then rolled back, **When** the rollback completes, **Then** the original column names and data are fully restored.

---

### Edge Cases

- What happens when a future insert supplies an unsupported but validly-formatted currency code (e.g., `XYZ`)? The database constraint only validates format (3-letter uppercase); application-level validation must restrict to the hardcoded `SUPPORTED_CURRENCIES` array in the constants module (initially `['USD']`).
- What happens if a column rename migration fails partway through? The migration must be wrapped in a transaction so all renames and additions succeed or fail atomically.
- How does the system handle mixed-currency comparisons (e.g., comparing a USD wallet balance to a EUR request amount)? The application must reject cross-currency operations — a payer's funding source currency must match the request currency.
- What happens to audit log metadata that embeds `balance_cents` keys in JSON? Existing audit JSON is historical and should remain unchanged; new audit entries must use the updated field names.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST rename `amount_cents` to `amount_minor` in the `payment_requests` table.
- **FR-002**: System MUST rename `amount_cents` to `amount_minor` in the `payment_transactions` table.
- **FR-003**: System MUST rename `balance_cents` to `balance_minor` in the `wallets` table.
- **FR-004**: System MUST rename `balance_cents` to `balance_minor` in the `bank_accounts` table.
- **FR-005**: System MUST add a `currency` column (`TEXT NOT NULL DEFAULT 'USD'`) to `payment_requests`, `payment_transactions`, `wallets`, and `bank_accounts`. The default is a transitional safety net; application code must always pass `currency` explicitly. The default will be removed in a future migration when multi-currency support ships.
- **FR-006**: System MUST enforce that `currency` values are exactly 3 uppercase letters via a `CHECK` constraint (e.g., `CHECK (currency ~ '^[A-Z]{3}$')`).
- **FR-007**: System MUST backfill all existing rows with `currency = 'USD'` as the default, since all current data is implicitly USD.
- **FR-008**: System MUST update the `process_payment` and `process_top_up` RPC functions to use the renamed columns and include `currency` in relevant inserts.
- **FR-009**: System MUST update all TypeScript types (`WalletRow`, `BankAccountRow`, `PaymentRequestRow`, `PaymentTransactionRow`, API types, component props) to use `*_minor` instead of `*_cents`.
- **FR-010**: System MUST update all TypeScript types to include a `currency` field of type `string` wherever a money amount is represented.
- **FR-011**: System MUST update the `formatCents` utility (and rename it) to accept a currency code, use an ISO 4217 minor-unit exponent lookup map to divide by the correct power of 10, and format amounts using the correct currency symbol and locale rules. The exponent map and its assumptions must be documented with an explicit code comment.
- **FR-012**: System MUST update `parseAmountToCents` (and rename it) to `parseAmountToMinor`, using the same ISO 4217 exponent lookup to multiply by the correct power of 10. The exponent assumption must be documented with an explicit code comment.
- **FR-013**: System MUST rename constants `AMOUNT_MIN_CENTS`, `AMOUNT_MAX_CENTS`, and `MOCKED_BANK_BALANCE_CENTS` to `AMOUNT_MIN_MINOR`, `AMOUNT_MAX_MINOR`, and `MOCKED_BANK_BALANCE_MINOR`.
- **FR-014**: System MUST update all Zod validation schemas that reference `amountCents` to use `amountMinor`.
- **FR-015**: System MUST update all server actions, service modules, API route handlers, and database query functions to use the new column and field names.
- **FR-016**: System MUST update all UI components that display or input money amounts to use the renamed fields and currency-aware formatting.
- **FR-017**: System MUST update seed data (`seed.sql`) to use `amount_minor`, `balance_minor`, and include `currency` values.
- **FR-018**: System MUST update all E2E and unit tests to use the renamed fields and verify currency-aware behavior.
- **FR-019**: System MUST ensure that cross-currency operations are rejected — a payment's funding source currency must match the payment request currency.
- **FR-020**: System MUST preserve existing audit log JSON as historical data; new audit entries must use updated field names.
- **FR-021**: System MUST maintain a hardcoded `SUPPORTED_CURRENCIES` array in the constants module (initially `['USD']`). Application-level validation must reject any currency not in this list, even if it passes the database format constraint.

### Key Entities

- **Money Value**: A monetary amount represented as an integer in the smallest denomination of its currency (minor units), paired with an ISO 4217 currency code. Key attributes: `amount_minor` (or `balance_minor`), `currency`.
- **Wallet**: A user's stored-value balance. Now carries `balance_minor` + `currency`.
- **Bank Account**: A linked external funding source. Now carries `balance_minor` + `currency`.
- **Payment Request**: A request for money from one user to another. Now carries `amount_minor` + `currency`.
- **Payment Transaction**: A record of a completed payment or top-up. Now carries `amount_minor` + `currency`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero occurrences of `_cents` exist in application source code, types, queries, constants, tests, seeds, or migration files (excluding historical audit JSON and prior spec documents).
- **SC-002**: 100% of rows in `payment_requests`, `payment_transactions`, `wallets`, and `bank_accounts` have a non-null, valid 3-letter `currency` value after migration.
- **SC-003**: All existing E2E and unit tests pass after the rename and currency addition, with updated assertions.
- **SC-004**: Users see no change in displayed amounts for existing USD data — formatted values remain identical before and after migration.
- **SC-005**: The application correctly formats amounts for at least USD, EUR, and TRY using the stored `currency` value (verified by unit tests on the formatting utility).
- **SC-006**: Any attempt to insert a row with a missing or invalid `currency` value is rejected by the database.
- **SC-007**: All balance-changing operations (payments, top-ups) continue to execute atomically with no partial state after the migration.

## Assumptions

- **Default currency is USD**: All existing data in the database was created under a single-currency (USD) assumption. The backfill will set `currency = 'USD'` for every existing row. The column carries `DEFAULT 'USD'` as a transitional safety net during migration, to be removed when multi-currency ships.
- **Minor units are exponent-aware**: The rename from `*_cents` to `*_minor` does not change stored values — `5000` still means $50.00 for USD. The formatter and parser use an ISO 4217 exponent lookup map to correctly handle currencies with different minor-unit scales (e.g., USD exponent 2, JPY exponent 0, KWD exponent 3). The exponent map and its assumptions are documented with explicit code comments.
- **No multi-currency transactions in this phase**: This feature adds the currency column and enforces it, but does not implement currency conversion or allow a single user to hold multiple currency wallets. Cross-currency support is a future feature.
- **RPC function signatures will change**: The `process_payment` and `process_top_up` PostgreSQL functions will be updated with new column names. Any external callers of these RPCs must be updated simultaneously.
- **Audit log JSON is append-only history**: Existing JSON blobs in audit logs that contain `balance_cents` keys will not be retroactively updated. They represent historical snapshots. Only new audit entries will use the `*_minor` naming.
- **Migration is transactional**: All column renames, additions, backfills, and RPC updates will execute within a single database transaction so the migration either fully succeeds or fully rolls back.
- **camelCase equivalents follow the same rename**: TypeScript properties like `amountCents` and `balanceCents` become `amountMinor` and `balanceMinor` respectively, following the same pattern.
- **Seed data reflects USD**: Updated seed files will include `currency = 'USD'` to match the backfill strategy.
