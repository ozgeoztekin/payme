# Data Model: Peer-to-Peer Payment Request Flow

**Feature Branch**: `001-p2p-payment-requests`  
**Date**: 2026-04-08  
**Plan**: [plan.md](./plan.md)

## Entity Overview

```
users 1────1 wallets
users 1────0..1 bank_accounts
users 1────* payment_requests (as requester_id)
payment_requests ────dynamic──── users (recipient matched by contact at query time)
payment_requests 1────0..1 payment_transactions
audit_logs ────references──── any entity (polymorphic via target_type + target_id)
```

---

## Entities

### 1. users

Extends Supabase `auth.users`. This table stores application-specific profile data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, references `auth.users(id)` | User identifier (matches Supabase Auth) |
| `display_name` | `text` | NOT NULL | User's display name |
| `email` | `text` | UNIQUE (nullable) | User's email address |
| `phone` | `text` | UNIQUE (nullable) | User's phone number (E.164 format) |
| `status` | `text` | NOT NULL, CHECK IN ('active', 'inactive'), DEFAULT 'active' | Account status |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Account creation time |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last profile update |

**Constraints**:
- `CHECK (email IS NOT NULL OR phone IS NOT NULL)` — at least one contact method required (FR-002).
- `UNIQUE(email)` where email is not null (FR-003).
- `UNIQUE(phone)` where phone is not null (FR-004).

**Indexes**:
- `idx_users_email` on `email` (for recipient matching).
- `idx_users_phone` on `phone` (for recipient matching).

---

### 2. wallets

One wallet per user. Created automatically when the user profile is created.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Wallet identifier |
| `user_id` | `uuid` | NOT NULL, UNIQUE, FK → users(id) ON DELETE CASCADE | Owner |
| `balance_cents` | `bigint` | NOT NULL, DEFAULT 0, CHECK >= 0 | Current balance in cents |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation time |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last balance change |

**Constraints**:
- `CHECK (balance_cents >= 0)` — balance can never go negative.
- `UNIQUE(user_id)` — exactly one wallet per user.

**Indexes**:
- `idx_wallets_user_id` on `user_id` (unique, for fast lookup by user).

---

### 3. bank_accounts

Mocked bank accounts. At most one per user (for authenticated users). Guest bank accounts have `user_id = NULL`.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Bank account identifier |
| `user_id` | `uuid` | FK → users(id) ON DELETE CASCADE, nullable | Owner (NULL for guest) |
| `bank_name` | `text` | NOT NULL | Display name of the bank |
| `account_number_masked` | `text` | NOT NULL | Last 4 digits, e.g., "••••1234" |
| `balance_cents` | `bigint` | NOT NULL, CHECK >= 0 | Simulated bank balance in cents |
| `is_guest` | `boolean` | NOT NULL, DEFAULT false | Whether this is a guest bank connection |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Connection time |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | Last update |

**Constraints**:
- `CHECK (balance_cents >= 0)` — simulated balance cannot go negative.
- For authenticated users: one bank account per user. Enforced at the application level (connecting a new account replaces the existing one).

**Indexes**:
- `idx_bank_accounts_user_id` on `user_id` (for lookup by user).

---

### 4. payment_requests

The central entity representing a money request from one party to another.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Request identifier |
| `requester_id` | `uuid` | NOT NULL, FK → users(id) | User who created the request |
| `recipient_type` | `text` | NOT NULL, CHECK IN ('email', 'phone') | How the recipient is identified |
| `recipient_value` | `text` | NOT NULL | Recipient's email or phone |
| `amount_cents` | `bigint` | NOT NULL, CHECK > 0 AND <= 1000000 | Requested amount in cents ($0.01–$10,000) |
| `note` | `text` | CHECK length <= 250 | Optional note from requester |
| `status` | `text` | NOT NULL, CHECK IN ('pending', 'paid', 'declined', 'canceled', 'expired'), DEFAULT 'pending' | Current lifecycle status |
| `share_token` | `uuid` | NOT NULL, UNIQUE, DEFAULT gen_random_uuid() | Non-guessable token for public link |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Creation time |
| `expires_at` | `timestamptz` | NOT NULL, DEFAULT now() + interval '7 days' | Expiration deadline |
| `resolved_at` | `timestamptz` | | When the request reached a terminal state |

**Constraints**:
- `CHECK (amount_cents > 0 AND amount_cents <= 1000000)` — $0.01 to $10,000.00.
- `CHECK (status IN ('pending', 'paid', 'declined', 'canceled', 'expired'))`.
- `CHECK (char_length(note) <= 250)` (when note is not null).
- `UNIQUE(share_token)` — ensures non-collision for public links.

**Indexes**:
- `idx_payment_requests_requester_id` on `requester_id` (outgoing requests query).
- `idx_payment_requests_recipient` on `(recipient_type, recipient_value)` (incoming requests query / lazy matching).
- `idx_payment_requests_share_token` on `share_token` (public link lookup).
- `idx_payment_requests_status` on `status` (filtering).
- `idx_payment_requests_created_at` on `created_at DESC` (sorting).

**State transitions** (enforced in application layer):

```
pending → paid | declined | canceled | expired
paid → (none)
declined → (none)
canceled → (none)
expired → (none)
```

**Expiration logic**: A request is effectively expired when `status = 'pending' AND expires_at <= now()`. This is evaluated at query time. A database view can expose an `effective_status` computed column.

---

### 5. payment_transactions

Records every financial movement — payment fulfillment and wallet top-ups.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Transaction identifier |
| `type` | `text` | NOT NULL, CHECK IN ('payment', 'top_up') | Transaction type |
| `request_id` | `uuid` | FK → payment_requests(id), nullable | Associated request (NULL for top-ups) |
| `payer_id` | `uuid` | FK → users(id), nullable | User who paid (NULL for guests) |
| `recipient_id` | `uuid` | NOT NULL, FK → users(id) | User who receives funds |
| `amount_cents` | `bigint` | NOT NULL, CHECK > 0 | Transaction amount in cents |
| `funding_source_type` | `text` | NOT NULL, CHECK IN ('wallet', 'bank_account') | What funded the payment |
| `funding_source_id` | `uuid` | NOT NULL | ID of the wallet or bank account used |
| `status` | `text` | NOT NULL, CHECK IN ('completed', 'failed'), DEFAULT 'completed' | Transaction outcome |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Transaction time |

**Constraints**:
- `CHECK (amount_cents > 0)`.
- `request_id` is NOT NULL when `type = 'payment'`, nullable when `type = 'top_up'`.

**Indexes**:
- `idx_payment_transactions_request_id` on `request_id` (lookup by request).
- `idx_payment_transactions_payer_id` on `payer_id` (user's transaction history).
- `idx_payment_transactions_recipient_id` on `recipient_id` (user's incoming transactions).

---

### 6. audit_logs

Immutable, append-only log of all critical business actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | Log entry identifier |
| `actor_id` | `uuid` | nullable | User who performed the action (NULL for guest/system) |
| `actor_type` | `text` | NOT NULL, CHECK IN ('user', 'guest', 'system') | Actor category |
| `action` | `text` | NOT NULL | Action type (e.g., `request.created`, `request.paid`) |
| `target_type` | `text` | NOT NULL | Entity type affected (e.g., `payment_request`, `wallet`) |
| `target_id` | `uuid` | NOT NULL | ID of the affected entity |
| `metadata` | `jsonb` | DEFAULT '{}' | Additional context (amounts, funding source, error details) |
| `outcome` | `text` | NOT NULL, CHECK IN ('success', 'failure') | Action outcome |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | Event timestamp |

**Constraints**:
- Append-only: no UPDATE or DELETE allowed. Enforced via RLS policy (deny UPDATE, DELETE) and application convention.

**Indexes**:
- `idx_audit_logs_target` on `(target_type, target_id)` (find all events for an entity).
- `idx_audit_logs_actor_id` on `actor_id` (find all events by a user).
- `idx_audit_logs_action` on `action` (filter by action type).
- `idx_audit_logs_created_at` on `created_at DESC` (chronological queries).

---

## Database View: Effective Request Status

```sql
CREATE VIEW payment_requests_view AS
SELECT
  *,
  CASE
    WHEN status = 'pending' AND expires_at <= now() THEN 'expired'
    ELSE status
  END AS effective_status
FROM payment_requests;
```

This view is used for all read queries to ensure expired requests are always correctly reported without requiring a batch update job.

---

## Row Level Security (RLS) Policies

### users
- SELECT: Users can read their own row.
- UPDATE: Users can update their own row.

### wallets
- SELECT: Users can read their own wallet.
- UPDATE: Denied via RLS (mutations go through service-role).

### bank_accounts
- SELECT: Users can read their own bank account.
- INSERT/UPDATE/DELETE: Denied via RLS (mutations go through service-role).

### payment_requests
- SELECT: Users can read requests where `requester_id = auth.uid()` OR where their email/phone matches `recipient_value`.
- INSERT/UPDATE: Denied via RLS (mutations go through service-role).

### payment_transactions
- SELECT: Users can read transactions where `payer_id = auth.uid()` OR `recipient_id = auth.uid()`.
- INSERT: Denied via RLS (created through service-role).

### audit_logs
- SELECT: Users can read audit logs where `actor_id = auth.uid()`.
- INSERT: Denied via RLS (created through service-role).
- UPDATE/DELETE: Denied to all roles.

**Note**: All write operations go through server actions using the Supabase service-role client, which bypasses RLS. This allows cross-user operations (e.g., crediting a requester's wallet when someone else pays) while keeping direct client access locked down.

---

## Seed Data (Development)

The seed script creates:

1. **Two test users** (Alice and Bob) with email and phone.
2. **Wallets** for each user (Alice: $100.00, Bob: $50.00).
3. **Bank accounts** for each user (balance: $10,000.00 each).
4. **Sample requests** in various statuses (pending, paid, declined, canceled, expired).
5. **Sample transactions** for paid requests and top-ups.
6. **Audit log entries** for all seeded actions.
