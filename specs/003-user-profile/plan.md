# Implementation Plan: User Profile

**Branch**: `003-user-profile` | **Date**: 2026-04-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-user-profile/spec.md`

## Summary

Add a Profile page to PayMe where authenticated users can view their identity information (email, phone), add a phone number (active users only), and log out. The feature reuses the existing `public.users` table (which already has `phone`, `email`, unique constraints, and an identity check), the existing phone validation schema (`phoneSchema` / E.164), the established audit service, and the existing `signOut` auth action. No database migration is required. The implementation adds one new page route, one profile service module, one server action module, a phone validator, and a navigation entry.

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: Next.js 15 (App Router), React 19, Supabase (Auth + Postgres), Tailwind CSS 4, Zod  
**Storage**: Supabase Postgres — existing `public.users` table with `phone text UNIQUE`, `email text UNIQUE`, `CHECK (email IS NOT NULL OR phone IS NOT NULL)`, and `status CHECK IN ('active', 'inactive')`  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Responsive web (mobile-first, 320px minimum)  
**Project Type**: Web application (Next.js App Router)  
**Performance Goals**: Profile page load < 2s (SC-001), phone add end-to-end < 30s (SC-002), UI feedback < 3s (SC-007)  
**Constraints**: No floating-point money (N/A — no money in this feature), atomic phone saves (FR-023), duplicate submission prevention (FR-024)  
**Scale/Scope**: 1 new page, 1 service, 1 action module, ~5 components, 2 new audit actions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Financial Integrity | N/A | No monetary values involved |
| II. Atomic and Fail-Safe Operations | PASS | Phone add is a single DB update; Supabase unique constraint provides atomicity for concurrent claims. No partial state possible. |
| III. Auditability | PASS | FR-031/FR-032 require audit for phone add and logout. Two new `AuditAction` values will be added. Uses existing `createAuditLog`. |
| IV. Backend-Enforced Validation | PASS | Server action validates phone format (E.164), uniqueness (DB constraint), active status, and no-overwrite rule. Client validation is UX-only. |
| V. User Experience Quality | PASS | FR-027–FR-030: responsive, loading/success/error/disabled states for add-phone. Duplicate submission prevention via UI guard + server idempotency. |
| VI. Testing Discipline | PASS | Unit tests for profile validator and service. E2E tests for view profile, add phone, logout, unauthenticated redirect. |
| VII. Simplicity and Maintainability | PASS | Reuses existing DB table, validators, audit service, component library, auth actions. No new abstractions. Single service module. |
| VIII. Documentation and AI Discipline | PASS | Plan, research, data-model, contracts, and tasks document all decisions. |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-user-profile/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (auth)/
│       └── profile/
│           ├── page.tsx           # Profile page (server component)
│           └── loading.tsx        # Skeleton UI
├── components/
│   └── profile/
│       ├── profile-info.tsx       # Read-only email + phone display
│       ├── add-phone-form.tsx     # Phone number add form (active users only)
│       └── logout-button.tsx      # Logout action button
├── lib/
│   ├── actions/
│   │   ├── auth-actions.ts        # MODIFIED — enhance signOut with audit log
│   │   └── profile-actions.ts     # NEW — addPhoneNumber server action
│   ├── services/
│   │   └── profile-service.ts     # MODIFIED — add getProfile, addPhone functions
│   ├── validators/
│   │   └── profile-validators.ts  # NEW — addPhoneSchema using phoneSchema
│   └── types/
│       ├── domain.ts              # MODIFIED — add PHONE_ADDED, USER_LOGOUT audit actions
│       └── api.ts                 # MODIFIED — add AddPhoneInput type
├── components/
│   └── layout/
│       └── app-sidebar.tsx        # MODIFIED — add Profile nav item

tests/
├── unit/
│   ├── validators/
│   │   └── profile-validators.test.ts  # Phone format, empty, whitespace
│   └── services/
│       └── profile-service.test.ts     # Add phone, duplicate, inactive user, overwrite prevention
└── e2e/
    └── profile.spec.ts                 # View profile, add phone, logout, auth redirect
```

**Structure Decision**: Follows existing patterns — page under `(auth)` route group, components in feature folder under `components/`, service + action + validator in `lib/`. No new directories beyond `profile/` under components and `profile/` under app routes.

## Complexity Tracking

> No violations found. Table left empty per instructions.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
