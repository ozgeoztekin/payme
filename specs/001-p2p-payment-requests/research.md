# Research: Peer-to-Peer Payment Request Flow

**Feature Branch**: `001-p2p-payment-requests`  
**Date**: 2026-04-08  
**Plan**: [plan.md](./plan.md)

## Research Tasks

### 1. Atomic Financial Transactions in Supabase/Postgres

**Decision**: Use Supabase's `rpc()` to call Postgres functions that wrap multi-step financial mutations in `BEGIN ... COMMIT` transactions with `SELECT ... FOR UPDATE` row locking.

**Rationale**: Supabase's JavaScript client does not natively expose multi-statement transactions. However, Postgres functions (invoked via `rpc()`) execute within a single transaction by default. This gives full ACID guarantees with row-level locking — exactly what's needed for payment processing.

**Alternatives considered**:
- **Supabase Edge Functions with direct SQL**: Possible but adds an extra deployment layer. Postgres functions are simpler and co-located with the data.
- **Application-level optimistic locking (version columns)**: Works for conflict detection but doesn't prevent concurrent reads as effectively as `SELECT FOR UPDATE`. Rejected for financial operations where strict serialization is required.
- **Supabase's `supabase-js` `.from().update()` chains**: Not transactional across multiple tables. Rejected because partial updates are forbidden by the constitution.

---

### 2. Lazy Expiration vs. Cron-Based Expiration

**Decision**: Compute expiration lazily at query time. Store `expires_at` on each request at creation. When querying or acting on a request, compare `expires_at` against `now()`.

**Rationale**: For MVP scale, lazy evaluation eliminates the need for a scheduled job, a task queue, or Supabase's `pg_cron` extension. Every query and action already checks request status, so adding an expiration time check is trivial. The database can enforce this via a computed column or view.

**Alternatives considered**:
- **pg_cron job to batch-update expired requests**: More accurate "exact moment" transitions, but adds infrastructure complexity. Rejected per Constitution Principle VII (simplicity).
- **Supabase Edge Function on a schedule**: Same downside as pg_cron plus additional cold-start latency. Overkill for MVP.
- **Client-side countdown only**: Insufficient — the server must enforce expiration for security. Client countdown is a UX complement, not a replacement.

**Implementation note**: A database view `payment_requests_with_status` can return an `effective_status` column:
```sql
CASE
  WHEN status = 'pending' AND expires_at <= now() THEN 'expired'
  ELSE status
END AS effective_status
```

---

### 3. Shareable Link Token Generation

**Decision**: Use `crypto.randomUUID()` (UUID v4) as the `share_token`. Store it on the `payment_requests` table with a unique index.

**Rationale**: UUID v4 provides 122 bits of randomness, making enumeration/guessing infeasible. Native to Node.js — no external dependency needed. URL-safe when used in path segments.

**Alternatives considered**:
- **nanoid**: Shorter URLs, but adds a dependency. UUID v4 is sufficient and built-in.
- **Sequential ID with HMAC signature**: More complex. The signed URL approach is overkill when a random token with a unique constraint achieves the same security properties.
- **Short numeric codes**: Guessable. Rejected for security reasons (FR-010).

---

### 4. Rate Limiting Strategy for Guest Endpoints

**Decision**: Use a lightweight in-memory rate limiter (e.g., a simple token bucket per IP) in the route handler. Limit guest payment and bank connection to 10 requests per IP per minute.

**Rationale**: For a single-instance Vercel deployment, in-memory rate limiting is the simplest approach. It resets on cold starts, which is acceptable for MVP. The spec requires "basic IP-based rate limiting" — not enterprise-grade DDoS protection.

**Alternatives considered**:
- **Vercel Edge Middleware with KV store**: More durable across instances, but adds Vercel KV dependency. Overkill for MVP.
- **Redis-based rate limiting**: Production-ready but requires a Redis instance. Rejected for simplicity.
- **Upstash rate limiting**: Good serverless option, but adds an external dependency. Can be adopted later if needed.

**Implementation note**: Use the `X-Forwarded-For` header (available on Vercel) to identify client IP.

---

### 5. Recipient Matching Strategy (Lazy)

**Decision**: Payment requests store `recipient_type` (email or phone) and `recipient_value` (the contact string). Matching to a user is performed at query time by joining against the users table on the matching contact field.

**Rationale**: Per spec clarification, lazy matching is required. This means:
- No `recipient_user_id` foreign key on the request.
- Dashboard queries join `payment_requests` with `users` where `recipient_value = users.email` (or phone).
- If a user registers after a request is created, the request automatically appears in their dashboard — no migration needed.

**Alternatives considered**:
- **Eager matching (resolve at creation)**: Simpler queries but misses recipients who register after the request is created. Rejected per spec decision.
- **Hybrid (resolve eagerly, backfill on registration)**: More complex. Requires a registration hook to scan pending requests. Rejected for simplicity.

**Performance note**: An index on `payment_requests(recipient_type, recipient_value)` and indexes on `users(email)` and `users(phone)` ensure efficient joins even at scale.

---

### 6. Supabase Auth Integration

**Decision**: Use Supabase Auth for session management. The Next.js middleware uses `@supabase/ssr` to read the session from cookies. Server actions and route handlers access the authenticated user via `supabase.auth.getUser()`.

**Rationale**: Supabase Auth is already the chosen auth provider. The `@supabase/ssr` package provides cookie-based session handling that works with Next.js middleware, server components, and server actions.

**Alternatives considered**:
- **NextAuth.js with Supabase adapter**: Adds unnecessary indirection. Supabase Auth is a complete solution.
- **Custom JWT handling**: More work, no benefit over Supabase's built-in session management.

---

### 7. Database Schema and Row Level Security

**Decision**: Define application tables in the `public` schema. Use Supabase RLS policies to restrict row access. Service-role queries (in server actions) bypass RLS when needed for cross-user operations (e.g., crediting a requester's wallet during payment).

**Rationale**: RLS adds a defense-in-depth layer. Even if a client somehow bypasses the server, they cannot access other users' data through direct Supabase queries. Service-role access is used only in server actions where cross-user mutations are authorized by business logic.

**Implementation note**: RLS policies:
- Users can read/update only their own profile and wallet.
- Users can read requests where they are the requester or matched recipient.
- Audit logs are insert-only from service role, read-only for the owning user.
- Bank accounts are read/write only by the owning user.

---

### 8. Guest Payment Architecture

**Decision**: Guest bank connections create a temporary `bank_accounts` record with `user_id = NULL` and `is_guest = TRUE`. The payment transaction references this bank account. The guest bank record persists for audit trail purposes but is not linked to any user account.

**Rationale**: Keeping the guest bank record (rather than making it truly ephemeral) preserves the audit trail. The `payment_transactions` table can reference the bank account used, enabling full traceability per Constitution Principle III.

**Alternatives considered**:
- **Fully ephemeral (no DB record)**: Simpler, but loses audit trail for the funding source. Rejected.
- **Create a "guest user" record**: Adds unnecessary complexity. A nullable `user_id` on bank accounts is simpler.

---

### 9. Next.js App Router Patterns

**Decision**: Use the App Router with route groups, server components for data fetching, client components for interactivity, and server actions for mutations.

**Rationale**: App Router is the modern Next.js standard. Server components reduce client bundle size and enable direct database access. Server actions provide a type-safe, form-friendly mutation API without separate API routes.

**Key patterns**:
- `(auth)` route group wraps all authenticated pages with a shared layout that checks auth.
- `middleware.ts` at the root handles auth redirects and the signed-in user → public link redirect.
- Server components fetch data and pass it as props to client components.
- Client components use `useTransition` to call server actions with pending state.

---

### 10. Money Formatting and Display

**Decision**: Store all monetary values as `bigint` cents in the database. TypeScript uses `number` for amounts (safe up to ~$90 trillion in cents). Display formatting uses `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })` with cents-to-dollars conversion (`amount / 100`).

**Rationale**: Integer cents eliminate floating-point errors per Constitution Principle I. JavaScript's `number` type safely handles integers up to `2^53 - 1`, which far exceeds the MVP's maximum of $10,000. `Intl.NumberFormat` provides locale-aware currency formatting.

**Alternatives considered**:
- **BigInt in TypeScript**: Unnecessary for the value range. Adds complexity with JSON serialization. Rejected.
- **Decimal.js library**: Overkill when integer arithmetic is used. Rejected for simplicity.

---

## Summary of Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Financial transactions | Postgres functions via `rpc()` with `SELECT FOR UPDATE` |
| 2 | Expiration | Lazy query-time check with `expires_at` column |
| 3 | Share tokens | UUID v4 via `crypto.randomUUID()` |
| 4 | Rate limiting | In-memory token bucket per IP |
| 5 | Recipient matching | Lazy join at query time on contact fields |
| 6 | Auth integration | Supabase Auth with `@supabase/ssr` |
| 7 | Data access control | Supabase RLS + service-role for cross-user ops |
| 8 | Guest payments | Guest bank records with `user_id = NULL` |
| 9 | App architecture | Next.js App Router, server components + server actions |
| 10 | Money formatting | Integer cents in DB, `Intl.NumberFormat` for display |

All NEEDS CLARIFICATION items resolved. No open questions remain.
