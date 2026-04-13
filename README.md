# PayMe — Peer-to-Peer Payment Requests

A full-stack P2P payment request platform built with **Next.js 15**, **React 19**, **Supabase**, and **Tailwind CSS 4**. Users can request money from friends via email or phone, pay with wallet or bank accounts, share payment links with anyone, and manage the full request lifecycle — all backed by atomic financial operations and comprehensive audit logging.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack & AI Tools Used](#tech-stack--ai-tools-used)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Spec-Kit Workflow](#spec-kit-workflow)
- [Local Development Setup](#local-development-setup)
- [Running E2E Tests](#running-e2e-tests)
- [GitHub Actions workflow](#github-actions-workflow)
- [Unit Tests](#unit-tests)
- [Key Design Decisions](#key-design-decisions)

---

## Project Overview

PayMe implements a **Venmo/Cash App-style payment request flow** as a responsive web application. The core user journey:

1. **Create a payment request** — enter a recipient's email or phone, an amount, and an optional note
2. **Share the link** — every request generates a unique public URL that can be sent through any channel
3. **Recipient sees the request** — it appears on their dashboard as an incoming pending request
4. **Pay** — the recipient selects a funding source (wallet or bank account), confirms, and the money moves atomically
5. **Dashboards update** — the request shows as "Paid," balances are adjusted in real time

Beyond the core flow, PayMe supports **guest payments** (anyone can pay via a public link without creating an account), **automatic expiration** (pending requests expire after 7 days), **decline and cancel** actions, **wallet top-ups** from connected bank accounts, and full **audit logging** of every critical business action.

---

## Live Demo

**[https://payme-weld.vercel.app](https://payme-weld.vercel.app)**

Full authentication is working — you can **sign up with your own account** using email and password and start using the app immediately. A complete registration flow with email confirmation is in place.

For convenience, test users are also pre-seeded with wallet balances and connected bank accounts so you can explore the full payment flow right away:

| User  | Email          | Password        |
| ----- | -------------- | --------------- |
| Alice | alice@test.com | testpassword123 |
| Bob   | bob@test.com   | testpassword123 |

---

## Features

| Feature                     | Description                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------ |
| **Create Payment Requests** | Specify recipient by email or phone, enter amount and optional note                  |
| **Shareable Payment Links** | Every request gets a unique, non-guessable public URL                                |
| **Pay with Wallet**         | Authenticated recipients can pay from their wallet balance                           |
| **Pay with Bank Account**   | Authenticated recipients can pay from a connected (mocked) bank account              |
| **Guest Payments**          | Anyone can pay via a public link using an inline bank connection — no account needed |
| **Decline & Cancel**        | Recipients can decline; requesters can cancel pending requests                       |
| **Automatic Expiration**    | Pending requests expire after 7 days with visible countdown                          |
| **Dashboard**               | Incoming/outgoing tabs with search, status filters, and pagination                   |
| **Wallet Management**       | View balance, top up from connected bank account                                     |
| **Bank Account Connection** | Simulated bank connection with mock $10,000 balance                                  |
| **User Profile**            | Manage display name, email, and phone number                                         |
| **Audit Logging**           | Every critical action logged with actor, action, target, timestamp, and outcome      |
| **Responsive Design**       | Fully usable from 320px mobile through large desktop viewports                       |

---

## Tech Stack & AI Tools Used

### Tech Stack

| Layer               | Technology                                                                     |
| ------------------- | ------------------------------------------------------------------------------ |
| **Framework**       | [Next.js 15](https://nextjs.org/) (App Router, Server Actions, Route Handlers) |
| **Language**        | TypeScript 5.x (strict mode)                                                   |
| **UI**              | React 19 + [Tailwind CSS 4](https://tailwindcss.com/)                          |
| **Database**        | [Supabase](https://supabase.com/) (hosted PostgreSQL + Auth)                   |
| **Auth**            | Supabase Auth (email/password)                                                 |
| **Validation**      | [Zod 4](https://zod.dev/) (shared client + server schemas)                     |
| **Unit Tests**      | [Vitest 4](https://vitest.dev/) with V8 coverage (90% thresholds)              |
| **E2E Tests**       | [Playwright 1.59](https://playwright.dev/) with video recording                |
| **CI/CD**           | GitHub Actions (lint, unit tests, build, E2E, GitHub Pages report)             |
| **Linting**         | ESLint 9 + Prettier                                                            |
| **Package Manager** | npm                                                                            |

### AI Tools

| Tool                                                | Role                                                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **[Cursor](https://cursor.com/)**                   | Primary AI coding tool — used for spec writing, implementation, debugging, and test authoring               |
| **[GitHub Spec-Kit](https://github.com/spec-kit)**  | Spec-driven workflow — generated specs, plans, task breakdowns, API contracts, checklists, and constitution |
| **[ChatGPT](https://chatgpt.com/)**                 | Research, brainstorming, and problem-solving assistant throughout development                               |
| **[Google Stitch](https://stitch.withgoogle.com/)** | Design reference — used for UI/UX inspiration and visual design direction                                   |

Cursor was used throughout the entire development lifecycle: writing the initial spec, generating implementation plans, breaking down tasks, implementing features, writing tests, and iterating on feedback. All AI-generated code was reviewed against the project constitution before acceptance.

---

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
              (request · payment · wallet · bank · audit · profile)
                              │
                              ▼
                    Supabase (Postgres + Auth)
              Tables with RLS · Atomic RPC functions
```

### Layer Responsibilities

- **Server Actions** — Thin authenticated entry points for mutations (create request, pay, decline, cancel, top-up, etc.). Delegate all business logic to services.
- **Route Handlers** — Guest/public endpoints (guest payment, guest bank connection, request listing) with IP-based rate limiting.
- **Domain Services** — Centralized business logic, validation, and authorization. No HTTP or UI concerns. This is where financial rules, status transitions, and atomicity are enforced.
- **Supabase RPC Functions** — `SECURITY DEFINER` Postgres functions (e.g., `process_payment`) with `SELECT FOR UPDATE` row locking for atomic financial operations.
- **Middleware** — Auth session refresh, redirect logic, public route detection.

---

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Authenticated route group
│   │   ├── dashboard/          #   Request dashboard (incoming/outgoing)
│   │   ├── requests/new/       #   Create new payment request
│   │   ├── requests/[id]/      #   Request detail view
│   │   ├── wallet/             #   Wallet balance + top-up
│   │   └── profile/            #   User profile management
│   ├── pay/[token]/            # Public payment page (no auth required)
│   ├── api/                    # Route handlers
│   │   ├── requests/           #   Request listing API
│   │   ├── wallet/             #   Wallet API
│   │   ├── pay-guest/          #   Guest payment endpoint
│   │   ├── bank-guest/         #   Guest bank connection endpoint
│   │   └── decline-guest/      #   Guest decline endpoint
│   ├── login/                  # Login page
│   ├── signup/                 # Signup page
│   └── auth/confirm/           # Email confirmation callback
├── components/                 # React components
│   ├── ui/                     #   Shared primitives (Button, Card, Input, Modal, Badge, MoneyInput, etc.)
│   ├── layout/                 #   App shell (Sidebar, PageLayout)
│   ├── requests/               #   Request-specific (form, card, list, detail, status badge)
│   ├── payment/                #   Payment flow (funding source selector, confirmation, guest flow)
│   ├── wallet/                 #   Wallet balance and top-up form
│   ├── bank/                   #   Bank connection flow and account card
│   └── profile/                #   Profile editing components
├── lib/
│   ├── actions/                # Server Actions (thin wrappers → services)
│   ├── services/               # Domain services (business logic)
│   ├── validators/             # Zod validation schemas (shared client + server)
│   ├── db/                     # Supabase admin client and transaction helpers
│   ├── supabase/               # Supabase client factories (server, browser, middleware)
│   ├── types/                  # TypeScript types (database rows, domain enums, API contracts)
│   ├── money.ts                # Currency formatting and conversion utilities
│   ├── rate-limit.ts           # IP-based rate limiter for guest endpoints
│   └── constants.ts            # App-wide constants (expiration days, amount limits, etc.)
├── hooks/                      # Custom React hooks (useRequests, useWallet, useBank)
└── middleware.ts               # Next.js middleware (auth, redirects)

supabase/
├── migrations/                 # SQL migrations
│   ├── 001_initial_schema.sql  #   Core tables, indexes, constraints
│   ├── 002_rpc_functions.sql   #   Atomic RPC functions (process_payment, etc.)
│   ├── 003_auto_create_profile.sql  # Auto-create profile + wallet on signup
│   └── 004_currency_safe_money.sql  # Currency-safe money columns + updated RPCs
└── seed.sql                    # Development seed data (test users, wallets, bank accounts)

tests/
├── e2e/                        # Playwright E2E tests (10 spec files)
└── unit/                       # Vitest unit tests

specs/                          # Spec-Kit generated specifications (see below)
scripts/                        # Helper scripts (E2E runner, data reset)
.github/workflows/ci.yml       # CI pipeline
```

---

## Spec-Kit Workflow

This project follows the **GitHub Spec-Kit** methodology. All features were specified, planned, and broken into tasks before implementation. The spec-driven workflow ensures AI agents (and humans) can implement features without ambiguity.

### Constitution

The project constitution defines 8 core principles that govern all development:

| #    | Principle                     | Summary                                                                             |
| ---- | ----------------------------- | ----------------------------------------------------------------------------------- |
| I    | Financial Integrity           | Integer minor units only, no floating-point money, internal consistency             |
| II   | Atomic & Fail-Safe Operations | Every financial mutation is all-or-nothing                                          |
| III  | Auditability                  | Structured audit logs for every critical action                                     |
| IV   | Backend-Enforced Validation   | Server validates everything; client validation is UX-only                           |
| V    | User Experience Quality       | Mobile-first, responsive, all states handled (loading/success/error/empty/disabled) |
| VI   | Testing Discipline            | E2E coverage for critical journeys, financial regressions are release blockers      |
| VII  | Simplicity & Maintainability  | Simplest correct architecture, no speculative abstractions                          |
| VIII | Documentation & AI Discipline | Specs are source of truth, AI output reviewed against constitution                  |

**File**: `[.specify/memory/constitution.md](.specify/memory/constitution.md)`

### Feature Specifications

Each feature goes through a structured lifecycle: **Spec → Clarification → Plan → Tasks → Implementation → Checklist**.

| #   | Feature              | Spec                                           | Plan                                           | Tasks                                            | Data Model                                                 | API Contract                                                         | Checklist                                                              |
| --- | -------------------- | ---------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 001 | P2P Payment Requests | [spec](specs/001-p2p-payment-requests/spec.md) | [plan](specs/001-p2p-payment-requests/plan.md) | [tasks](specs/001-p2p-payment-requests/tasks.md) | [data-model](specs/001-p2p-payment-requests/data-model.md) | [api](specs/001-p2p-payment-requests/contracts/api.md)               | [checklist](specs/001-p2p-payment-requests/checklists/requirements.md) |
| 002 | Remove Settings Page | [spec](specs/002-remove-settings/spec.md)      | —                                              | [tasks](specs/002-remove-settings/tasks.md)      | —                                                          | —                                                                    | —                                                                      |
| 003 | User Profile         | [spec](specs/003-user-profile/spec.md)         | [plan](specs/003-user-profile/plan.md)         | [tasks](specs/003-user-profile/tasks.md)         | [data-model](specs/003-user-profile/data-model.md)         | [api](specs/003-user-profile/contracts/api.md)                       | [checklist](specs/003-user-profile/checklists/requirements.md)         |
| 004 | Currency-Safe Money  | [spec](specs/004-currency-safe-money/spec.md)  | [plan](specs/004-currency-safe-money/plan.md)  | [tasks](specs/004-currency-safe-money/tasks.md)  | [data-model](specs/004-currency-safe-money/data-model.md)  | —                                                                    | [checklist](specs/004-currency-safe-money/checklists/requirements.md)  |
| 005 | CI/GitHub Workflow   | [spec](specs/005-ci-github-workflow/spec.md)   | [plan](specs/005-ci-github-workflow/plan.md)   | [tasks](specs/005-ci-github-workflow/tasks.md)   | [data-model](specs/005-ci-github-workflow/data-model.md)   | [ci-workflow](specs/005-ci-github-workflow/contracts/ci-workflow.md) | —                                                                      |
| 006 | Parallel E2E Tests   | [spec](specs/006-parallel-e2e-tests/spec.md)   | [plan](specs/006-parallel-e2e-tests/plan.md)   | [tasks](specs/006-parallel-e2e-tests/tasks.md)   | [data-model](specs/006-parallel-e2e-tests/data-model.md)   | —                                                                    | —                                                                      |
| 007 | Unit Test Coverage   | —                                              | [plan](specs/007-unit-test-coverage/plan.md)   | [tasks](specs/007-unit-test-coverage/tasks.md)   | —                                                          | —                                                                    | —                                                                      |

---

## Local Development Setup

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **npm** 10+
- **Docker** (for local Supabase — or use a hosted Supabase project)
- **Supabase CLI** (installed via `npx supabase`)

### Step 1: Clone the repository

```bash
git clone https://github.com/ozgeoztekin/payme.git
cd payme
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Start local Supabase

```bash
npx supabase start
```

Note the output — it provides the local URL, anon key, and service role key.

### Step 4: Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with the values from `supabase start`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-start>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 5: Apply database migrations and seed data

```bash
npx supabase db push
npx supabase db seed
```

This creates all tables, RPC functions, triggers, and seeds test users (Alice & Bob) with wallets and bank accounts.

### Step 6: Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with one of the test accounts.

---

## Running E2E Tests

The E2E test suite uses **Playwright** with **automated video recording** enabled for every test run.

### Test Architecture

Tests are split into two Playwright projects to balance speed and correctness:

| Project              | Tests                                                                          | Parallelism       | Why                                                                           |
| -------------------- | ------------------------------------------------------------------------------ | ----------------- | ----------------------------------------------------------------------------- |
| **parallel**         | Dashboard, create request, decline/cancel, expiration, profile, public payment | Fully parallel    | Read-heavy or isolated mutations — safe to run concurrently                   |
| **serial-financial** | Pay with wallet, pay with bank, wallet top-up                                  | Serial (1 worker) | Balance-dependent assertions — must run sequentially to avoid race conditions |

### E2E Test Files

| Test File                       | Coverage                                                                 |
| ------------------------------- | ------------------------------------------------------------------------ |
| `create-request.spec.ts`        | Create request via email/phone, validation, success flow, shareable link |
| `pay-with-wallet.spec.ts`       | Pay a pending request using wallet balance, balance verification         |
| `pay-with-bank.spec.ts`         | Pay a pending request using bank account, balance verification           |
| `public-payment.spec.ts`        | Guest payment flow via public shareable link                             |
| `decline-cancel.spec.ts`        | Decline incoming request, cancel outgoing request                        |
| `expiration.spec.ts`            | Request expiration behavior after 7 days                                 |
| `wallet-topup.spec.ts`          | Top up wallet from bank, insufficient balance handling                   |
| `dashboard-balance.spec.ts`     | Dashboard wallet balance display, bank account card                      |
| `dashboard-empty-state.spec.ts` | Empty state rendering for incoming/outgoing tabs                         |
| `profile.spec.ts`               | Display name, email, and phone profile management                        |

### GitHub Actions workflow

Continuous integration is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). On every **push** and **pull request** to `main`, GitHub Actions runs **lint**, **unit tests**, **production build**, and then the full **Playwright E2E suite** (with video recording). The E2E job uploads artifacts and deploys the **Playwright HTML report** to **GitHub Pages**, so the latest run is viewable without cloning the repo.

**Latest E2E report (GitHub Pages):** [https://ozgeoztekin.github.io/payme](https://ozgeoztekin.github.io/payme)

**Local runs** — use the same flow as CI on your machine:

```bash
# Install Playwright browsers (first time only)
npx playwright install --with-deps chromium

# Run the full E2E suite
npm run test:e2e
```

This runs both the **parallel** and **serial-financial** test projects, merges results into a single HTML report, and records videos of every test.

After running `npm run test:e2e`, videos are saved to:

```
test-results/
├── create-request-US1-Create-…/video.webm
├── pay-with-wallet-US2-Pay-…/video.webm
├── public-payment-US7-Guest-…/video.webm
├── decline-cancel-US8-Decline-…/video.webm
├── expiration-US9-Expired-…/video.webm
└── ... (one video per test case)
```

After a run, open the interactive Playwright HTML report:

```bash
npx playwright show-report playwright-report
```

Unit tests and coverage are covered in [Unit Tests](#unit-tests).

---

## Unit Tests

Unit tests cover business logic, validation, and financial correctness using **Vitest** with **V8 coverage** (90% thresholds for statements, branches, functions, and lines).

```bash
# Run unit tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode
npm run test:watch
```

Coverage target: `src/lib/**/*.ts` — domain services, validators, money utilities, and action modules.

The same unit test and lint steps run in CI on every push/PR to `main`; see [GitHub Actions workflow](#github-actions-workflow) under [Running E2E Tests](#running-e2e-tests).

---

## Key Design Decisions

| Decision                          | Rationale                                                                                                                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Integer minor units for money** | Eliminates floating-point rounding errors. All amounts stored as `bigint` cents (e.g., $25.00 = 2500). Formatting happens only at the presentation layer.                                                        |
| **Atomic RPC functions**          | Payment processing uses Postgres `SECURITY DEFINER` functions with `SELECT FOR UPDATE` to ensure wallet debits, credits, and status transitions happen in a single transaction. No partial updates are possible. |
| **Lazy expiration**               | Instead of a cron job, expiration is computed at query time via a database view. Simpler, no infrastructure overhead, always consistent.                                                                         |
| **Two Playwright projects**       | Financial tests (wallet/bank payments, top-ups) run serially to avoid balance race conditions. All other tests run in parallel for speed.                                                                        |
| **Domain services layer**         | Business logic lives in `src/lib/services/`, not in route handlers or UI components. This keeps handlers thin and logic testable.                                                                                |
| **Shared Zod validators**         | Validation schemas are defined once and used on both client (UX feedback) and server (security boundary).                                                                                                        |
| **Guest payment flow**            | Public shareable links allow non-users to pay via inline bank connection, extending the product's reach beyond registered users.                                                                                 |
| **IP-based rate limiting**        | Guest endpoints are rate-limited to prevent abuse on unauthenticated flows.                                                                                                                                      |
| **Comprehensive audit logging**   | Every critical action (create, pay, decline, cancel, top-up, bank connect) generates a structured audit log entry with actor, action, target, timestamp, and outcome.                                            |

---

## Known Limitations (POC Scope)

This is a proof-of-concept. The following were intentionally left out or simplified to keep the scope focused on the core payment request flow:

- **No password strength rules** — users can register with simple passwords for ease of testing
- **No forgot password / password reset flow** — only sign-up and sign-in are implemented
- **USD only** — a single currency is supported; no multi-currency wallets or conversion
- **No localization** — the app is English-only with US dollar formatting
- **One bank account per user** — connecting a new bank account replaces the existing one
- **No real-time updates** — dashboards reflect state at page load; no WebSocket or SSE push

---

## License

This project was built as part of a hiring assignment and is not licensed for production use.
