# 007 – Unit Test Coverage Plan

## Goal
Increase unit test coverage of `src/lib/**/*.ts` from ~42% to ≥ 90%.

## Tech Stack
- Vitest 4.x with v8 coverage provider
- Mock strategy: `vi.mock()` for Supabase client, audit-service, Next.js server APIs

## Approach
1. Pure-logic modules first (rate-limit, utils, validators, DB transaction wrappers)
2. Service modules with uncovered branches (audit, bank, request, profile)
3. Server actions (mock `createClient`, `supabaseAdmin`, Next.js `redirect`/`revalidatePath`/`cookies`)
4. Set coverage threshold in vitest config to enforce 90% going forward

## Coverage Scope
`src/lib/**/*.ts` as configured in `vitest.config.ts`
