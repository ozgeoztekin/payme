# Quickstart: PayMe Development Setup

**Feature Branch**: `001-p2p-payment-requests`  
**Date**: 2026-04-08

## Prerequisites

- **Node.js** 20+ (LTS)
- **pnpm** 9+ (package manager)
- **Docker** (for local Supabase)
- **Supabase CLI** (`npx supabase`)

## Initial Setup

### 1. Clone and Install

```bash
git clone <repo-url> payme
cd payme
git checkout 001-p2p-payment-requests
pnpm install
```

### 2. Start Local Supabase

```bash
npx supabase start
```

This starts a local Supabase instance (Postgres, Auth, Studio) via Docker. On first run, it downloads the required Docker images.

Note the output — it provides the local Supabase URL and keys:

```
API URL: http://127.0.0.1:54321
anon key: eyJ...
service_role key: eyJ...
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
```

### 3. Configure Environment

Copy the example env file and fill in the Supabase values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-start>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Database Migrations

```bash
npx supabase db push
```

This applies all migrations from `supabase/migrations/` to the local database.

### 5. Seed Development Data

```bash
npx supabase db seed
```

This populates the database with test users, wallets, bank accounts, and sample requests. See `supabase/seed.sql` for details.

### 6. Start the Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test Users (Seed Data)

| User | Email | Phone | Wallet | Bank Balance |
|------|-------|-------|--------|-------------|
| Alice | alice@test.com | +15551234567 | $100.00 | $10,000.00 |
| Bob | bob@test.com | +15559876543 | $50.00 | $10,000.00 |

Password for both: `testpassword123`

## Running Tests

### Unit Tests (Vitest)

```bash
pnpm test
```

Watch mode:

```bash
pnpm test:watch
```

### E2E Tests (Playwright)

Ensure the dev server is running, then:

```bash
pnpm test:e2e
```

Run a specific test file:

```bash
pnpm test:e2e -- tests/e2e/create-request.spec.ts
```

## Project Structure

```
src/
├── app/          # Next.js App Router (pages + API routes)
├── components/   # React components (ui/ for shared primitives)
├── lib/          # Business logic, server actions, validators, DB utilities
├── hooks/        # Custom React hooks
└── middleware.ts  # Auth + route protection

supabase/
├── migrations/   # SQL migration files
└── seed.sql      # Development seed data

tests/
├── e2e/          # Playwright E2E tests
└── unit/         # Vitest unit tests
```

## Key Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run Vitest unit tests |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `npx supabase start` | Start local Supabase |
| `npx supabase stop` | Stop local Supabase |
| `npx supabase db push` | Apply migrations |
| `npx supabase db seed` | Run seed script |
| `npx supabase db reset` | Reset DB (migrations + seed) |
| `npx supabase migration new <name>` | Create a new migration |

## Supabase Studio

Access the local database GUI at [http://127.0.0.1:54323](http://127.0.0.1:54323) after running `npx supabase start`. Use it to inspect tables, run queries, and view auth users.
