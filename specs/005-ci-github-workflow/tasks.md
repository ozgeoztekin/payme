# Tasks: CI/CD with GitHub Actions

**Input**: Design documents from `/specs/005-ci-github-workflow/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story. Since all jobs live in a single `.github/workflows/ci.yml` file, each user story phase adds a new job to the workflow incrementally.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Workflow file**: `.github/workflows/ci.yml` (single new file)
- **Existing configs**: `playwright.config.ts`, `vitest.config.ts`, `package.json`
- **Existing tests**: `tests/unit/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the workflow directory structure and scaffold with trigger configuration

- [X] T001 Create `.github/workflows/` directory and scaffold `ci.yml` with workflow name and trigger configuration (`on: push/pull_request to main`) in `.github/workflows/ci.yml`

---

## Phase 2: User Story 1 - Unit Tests Run on Every Push to Main (Priority: P1) 🎯 MVP

**Goal**: Vitest unit tests run automatically on push to `main` and PRs targeting `main`, reporting pass/fail status.

**Independent Test**: Push a commit to `main` or open a PR targeting `main` and verify the `unit-test` job runs `npm test` and reports a status check.

### Implementation for User Story 1

- [X] T002 [US1] Add `unit-test` job to `.github/workflows/ci.yml` with: checkout via `actions/checkout@v4`, Node.js 20.x setup via `actions/setup-node@v4` with `cache: 'npm'`, `npm ci`, and `npm test`

**Checkpoint**: At this point, pushing to `main` triggers a workflow that runs all 9 unit test files via Vitest

---

## Phase 3: User Story 2 - E2E Tests Run on Every Push to Main (Priority: P1)

**Goal**: Playwright e2e tests run automatically with access to the hosted Supabase instance, and upload debug artifacts on failure.

**Independent Test**: Push a commit to `main` and verify the `e2e-test` job runs all 10 Playwright spec files against hosted Supabase. On a deliberate failure, verify the `playwright-report` artifact is downloadable.

### Implementation for User Story 2

- [X] T003 [US2] Add `e2e-test` job to `.github/workflows/ci.yml` with: `needs: [build]` dependency, checkout, Node.js 20.x setup with npm cache, `npm ci`, Playwright Chromium install via `npx playwright install --with-deps chromium`, and `npm run test:e2e`
- [X] T004 [US2] Configure environment variables for the `e2e-test` job in `.github/workflows/ci.yml`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_APP_URL` sourced from GitHub secrets
- [X] T005 [US2] Add artifact upload step to `e2e-test` job in `.github/workflows/ci.yml` using `actions/upload-artifact@v4` to upload `playwright-report/` and `test-results/` directories, conditioned on `if: ${{ !cancelled() }}` to capture reports on failure

**Checkpoint**: At this point, e2e tests run against hosted Supabase in CI, and failure artifacts are available for download

---

## Phase 4: User Story 3 - Linting Runs as Part of CI (Priority: P2)

**Goal**: ESLint and Prettier checks run in CI to enforce code style consistency.

**Independent Test**: Push a commit with a formatting issue to a PR targeting `main` and verify the `lint` job fails with a descriptive error.

### Implementation for User Story 3

- [X] T006 [US3] Add `lint` job to `.github/workflows/ci.yml` with: checkout, Node.js 20.x setup with npm cache, `npm ci`, and `npm run lint`

**Checkpoint**: At this point, lint checks run in parallel with other jobs on every push/PR

---

## Phase 5: User Story 4 - Build Verification (Priority: P2)

**Goal**: `next build` runs in CI to catch TypeScript errors and build failures before deployment.

**Independent Test**: Push a commit with a TypeScript type error to a PR targeting `main` and verify the `build` job fails.

### Implementation for User Story 4

- [X] T007 [US4] Add `build` job to `.github/workflows/ci.yml` with: checkout, Node.js 20.x setup with npm cache, `npm ci`, and `npm run build`
- [X] T008 [US4] Configure environment variables for the `build` job in `.github/workflows/ci.yml`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` sourced from GitHub secrets (required for Next.js build)

**Checkpoint**: At this point, all 4 jobs are defined — lint, unit-test, build, and e2e-test (depends on build)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and verification across all jobs

- [X] T009 Update `specs/005-ci-github-workflow/quickstart.md` with final secrets list and any adjustments discovered during implementation
- [X] T010 Validate the complete workflow by reviewing `.github/workflows/ci.yml` against the contract in `specs/005-ci-github-workflow/contracts/ci-workflow.md` — verify all 4 jobs, correct triggers, correct secrets, correct dependencies, and artifact upload

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **User Stories (Phases 2–5)**: All depend on Phase 1 (scaffold must exist)
  - US1 (unit-test) and US3 (lint) have no secrets — simplest to implement first
  - US4 (build) needs `NEXT_PUBLIC_*` secrets
  - US2 (e2e-test) depends on the `build` job existing (US4) due to `needs: [build]`
- **Polish (Phase 6)**: Depends on all user story phases being complete

### User Story Dependencies

- **User Story 1 (P1 — unit-test)**: Depends only on Phase 1 scaffold. No secrets needed.
- **User Story 2 (P1 — e2e-test)**: Depends on Phase 1 scaffold. Also depends on User Story 4 (build job) because `e2e-test` has `needs: [build]`.
- **User Story 3 (P2 — lint)**: Depends only on Phase 1 scaffold. No secrets needed.
- **User Story 4 (P2 — build)**: Depends only on Phase 1 scaffold. Needs `NEXT_PUBLIC_*` secrets.

### Recommended Execution Order

```
T001 (scaffold) → T002 (unit-test) → T006 (lint) → T007–T008 (build) → T003–T005 (e2e-test) → T009–T010 (polish)
```

### Parallel Opportunities

- After T001 completes, T002 (unit-test) and T006 (lint) can be implemented in parallel since they are independent jobs with no secrets.
- T007–T008 (build) can also be implemented in parallel with T002 and T006.
- T003–T005 (e2e-test) should be implemented after T007–T008 (build) since the e2e job has `needs: [build]`.

---

## Parallel Example: After Phase 1

```bash
# These can all be done in parallel (all add independent jobs to ci.yml):
Task: "T002 [US1] Add unit-test job to .github/workflows/ci.yml"
Task: "T006 [US3] Add lint job to .github/workflows/ci.yml"
Task: "T007 [US4] Add build job to .github/workflows/ci.yml"
```

Note: Since all tasks modify the same file (`.github/workflows/ci.yml`), true parallelism requires care to avoid merge conflicts. In practice, implementing sequentially within a single session is recommended.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Scaffold workflow file with triggers
2. Complete Phase 2: Add `unit-test` job
3. **STOP and VALIDATE**: Push to `main` and verify the unit-test job runs
4. Merge MVP — CI now catches unit test regressions

### Incremental Delivery

1. T001 (scaffold + triggers) → Workflow exists but does nothing
2. Add `unit-test` job (T002) → MVP! Unit tests run in CI
3. Add `lint` job (T006) → Code style enforced
4. Add `build` job (T007–T008) → Type errors caught
5. Add `e2e-test` job (T003–T005) → Full CI pipeline with e2e coverage
6. Polish (T009–T010) → Documentation finalized

### Prerequisite: GitHub Secrets Configuration

Before e2e and build jobs can succeed in CI, the following secrets must be configured in the GitHub repository (Settings → Secrets and variables → Actions):

| Secret | Value |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

---

## Notes

- All jobs target a single file: `.github/workflows/ci.yml`
- [Story] label maps task to specific user story for traceability
- Commit after each phase to enable incremental validation
- The e2e-test job is the most complex (secrets, Playwright install, artifacts) — implement last
- Verify GitHub secrets are configured before expecting build/e2e jobs to pass
