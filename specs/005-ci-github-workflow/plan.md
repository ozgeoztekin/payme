# Implementation Plan: CI/CD with GitHub Actions

**Branch**: `005-ci-github-workflow` | **Date**: 2026-04-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-ci-github-workflow/spec.md`

## Summary

Add a GitHub Actions workflow that automatically runs linting, unit tests, build verification, and Playwright e2e tests on every push to `main` and every pull request targeting `main`. The workflow uses parallel jobs for speed and uploads Playwright artifacts on failure for debugging.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20.x  
**Primary Dependencies**: Next.js 15 (App Router), Vitest 4.x, Playwright 1.59.x, ESLint 9.x, Prettier 3.x  
**Storage**: N/A (infrastructure feature — no database changes)  
**Testing**: Vitest (unit, `tests/unit/`), Playwright (e2e, `tests/e2e/`), ESLint + Prettier (lint)  
**Target Platform**: GitHub Actions (ubuntu-latest runners)  
**Project Type**: Web application CI/CD pipeline  
**Performance Goals**: Workflow completes within 10 minutes for a typical run  
**Constraints**: E2e tests depend on hosted Supabase instance; secrets must be configured in GitHub  
**Scale/Scope**: Single workflow file, 4 jobs, ~100 lines of YAML

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Financial Integrity | N/A | No financial logic changes |
| II. Atomic and Fail-Safe Operations | N/A | No state-changing operations |
| III. Auditability | N/A | GitHub Actions provides built-in audit trail |
| IV. Backend-Enforced Validation | N/A | No validation changes |
| V. User Experience Quality | N/A | No UI changes |
| VI. Testing Discipline | ✅ ALIGNED | This feature directly enforces testing discipline by running all tests in CI |
| VII. Simplicity and Maintainability | ✅ ALIGNED | Single workflow file, minimal configuration, no unnecessary abstractions |
| VIII. Documentation and AI Discipline | ✅ ALIGNED | Spec, plan, and quickstart document all decisions |

**Gate result**: PASS — no violations. This feature directly supports Principle VI (Testing Discipline) by ensuring critical user journeys have automated CI enforcement.

**Post-Phase 1 re-check**: PASS — design remains aligned. No complexity violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/005-ci-github-workflow/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no data model changes)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── ci-workflow.md   # Job contract definitions
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    └── ci.yml           # GitHub Actions workflow (NEW)
```

**Structure Decision**: This feature adds a single YAML file under `.github/workflows/`. No changes to `src/` or `tests/` directories. The existing test infrastructure (Vitest config, Playwright config, global setup) is used as-is.

## Implementation Design

### Workflow Architecture

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:         # Parallel — fast feedback
  unit-test:    # Parallel — no external deps
  build:        # Parallel — validates compilation
  e2e-test:     # Sequential — depends on build
```

### Job Details

#### 1. `lint`
- Checkout → Setup Node 20.x with npm cache → `npm ci` → `npm run lint`
- Fast; no secrets needed.

#### 2. `unit-test`
- Checkout → Setup Node 20.x with npm cache → `npm ci` → `npm test`
- Fast; no secrets needed. Vitest runs in Node environment.

#### 3. `build`
- Checkout → Setup Node 20.x with npm cache → `npm ci` → `npm run build`
- Requires `NEXT_PUBLIC_*` env vars for Next.js build.

#### 4. `e2e-test`
- **Depends on**: `build` (ensures app compiles before expensive browser tests)
- Checkout → Setup Node 20.x with npm cache → `npm ci` → Install Playwright Chromium → `npm run test:e2e`
- Requires all Supabase secrets for global setup (user creation, data seeding).
- On failure: uploads `playwright-report/` and `test-results/` as artifacts.

### Secrets Required

All stored as GitHub repository secrets:

| Secret | Used By |
|--------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | build, e2e-test |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build, e2e-test |
| `SUPABASE_SERVICE_ROLE_KEY` | e2e-test |
| `NEXT_PUBLIC_APP_URL` | build, e2e-test |

### Key Design Decisions

1. **Parallel jobs over sequential pipeline**: Lint, unit tests, and build run concurrently. Only e2e tests wait for build, since they need the app to compile. This minimizes total workflow time.

2. **Hosted Supabase over local**: The project already uses hosted Supabase for development. The global setup (`tests/e2e/global-setup.ts`) is idempotent. This avoids Docker-in-Docker complexity.

3. **Chromium-only for Playwright**: The existing `playwright.config.ts` only configures Chromium. Installing only Chromium in CI saves ~2 minutes vs. installing all browsers.

4. **Artifact upload on failure only**: Playwright reports and videos are uploaded only when e2e tests fail, avoiding unnecessary storage consumption.

5. **npm cache via setup-node**: The `actions/setup-node` built-in npm cache provides fast `npm ci` without maintaining a separate cache configuration.

## Complexity Tracking

No violations. Single workflow file with standard GitHub Actions patterns. No unnecessary abstractions.
