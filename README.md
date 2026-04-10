# PayMe — Peer-to-Peer Payment Requests

A full-stack peer-to-peer payment request system built with Next.js 15 and Supabase. Users can create payment requests, share them via public links, pay with wallet or bank accounts, and manage request lifecycles — all with atomic financial operations and full audit logging.

## Architecture

```
Client (Browser)
  └─ Next.js React App (Server + Client Components, Tailwind CSS 4)
         │
         ├─ Server Actions ──┐
         ├─ Route Handlers ──┤
         └─ Middleware ───────┤
                              ▼
                    Domain Services
              (request · payment · wallet · bank · audit)
                              │
                              ▼
                    Supabase (Postgres + Auth)
              Tables with RLS · Atomic RPC functions
```

**Key design decisions:**

- All monetary values stored as **integer cents** (`bigint`) — no floating-point math
- Financial mutations are **atomic** via Postgres `rpc()` functions with `SELECT FOR UPDATE` row locking
- Expiration is **lazy** — evaluated at query time via a database view (`payment_requests_view`)
- Server actions handle authenticated mutations; route handlers serve guest endpoints with IP-based rate limiting
- Domain logic is centralized in service modules, not in UI components or route handlers

## Tech Stack

| Layer           | Technology               |
| --------------- | ------------------------ |
| Framework       | Next.js 15 (App Router)  |
| Language        | TypeScript 5.x           |
| UI              | React 19, Tailwind CSS 4 |
| Database        | Supabase (PostgreSQL)    |
| Auth            | Supabase Auth            |
| Unit Tests      | Vitest                   |
| E2E Tests       | Playwright               |
| Package Manager | pnpm                     |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (auth)/             # Authenticated route group (dashboard, requests, wallet, settings)
│   ├── pay/[token]/        # Public payment page (no auth required)
│   └── api/                # Route handlers (guest endpoints, request listing)
├── components/             # React components
│   ├── ui/                 # Shared primitives (Button, Card, Input, Modal, Badge, etc.)
│   ├── requests/           # Request-specific (form, card, list, detail, status badge)
│   ├── payment/            # Payment flow (funding source selector, confirmation, guest flow)
│   ├── wallet/             # Wallet balance and top-up form
│   └── bank/               # Bank connection flow and account card
├── lib/
│   ├── actions/            # Server Actions (request, payment, wallet, bank)
│   ├── services/           # Domain services (business logic, no HTTP concerns)
│   ├── validators/         # Zod validation schemas (shared client + server)
│   ├── db/                 # Supabase admin client and transaction helpers
│   ├── supabase/           # Supabase client factories (server, browser, middleware)
│   └── types/              # TypeScript types (database rows, domain enums, API contracts)
├── hooks/                  # Custom React hooks (useRequests, useWallet, useBank)
└── middleware.ts           # Auth redirect, public route detection

supabase/
├── migrations/             # SQL migrations (schema, RPC functions)
└── seed.sql                # Development seed data (test users, wallets, sample requests)

tests/
├── e2e/                    # Playwright E2E tests
└── unit/                   # Vitest unit tests
```

## Prerequisites

- **Node.js** 20+ (LTS)
- **pnpm** 9+
- **Docker** (for local Supabase)
- **Supabase CLI** (`npx supabase`)

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start local Supabase

```bash
npx supabase start
```

Note the output — it provides the local URL and keys needed for the next step.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with the values from `supabase start`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Apply database migrations and seed data

```bash
npx supabase db push
npx supabase db seed
```

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test Users

| User  | Email          | Password        | Wallet  | Bank Balance |
| ----- | -------------- | --------------- | ------- | ------------ |
| Alice | alice@test.com | testpassword123 | $100.00 | $10,000.00   |
| Bob   | bob@test.com   | testpassword123 | $50.00  | $10,000.00   |

## Development Commands

| Command                 | Description                  |
| ----------------------- | ---------------------------- |
| `pnpm dev`              | Start Next.js dev server     |
| `pnpm build`            | Production build             |
| `pnpm lint`             | Run ESLint                   |
| `pnpm test`             | Run Vitest unit tests        |
| `pnpm test:watch`       | Run Vitest in watch mode     |
| `pnpm test:e2e`         | Run Playwright E2E tests     |
| `npx supabase start`    | Start local Supabase         |
| `npx supabase stop`     | Stop local Supabase          |
| `npx supabase db push`  | Apply migrations             |
| `npx supabase db seed`  | Run seed script              |
| `npx supabase db reset` | Reset DB (migrations + seed) |

## Features

- **Create Payment Requests** — specify recipient (email or phone), amount, and optional note
- **Shareable Links** — every request generates a public URL for easy sharing
- **Pay via Wallet or Bank** — authenticated recipients choose their funding source
- **Guest Payments** — anyone can pay via a public link without creating an account
- **Decline / Cancel** — recipients can decline; requesters can cancel pending requests
- **Automatic Expiration** — pending requests expire after 7 days
- **Dashboard** — incoming/outgoing tabs with search, status filters, and pagination
- **Wallet Management** — view balance and top up from a connected bank account
- **Bank Account Connection** — simulated bank connection with mock $10,000 balance
- **Audit Logging** — every critical action is logged with actor, target, and outcome
