# Feature Specification: CI/CD with GitHub Actions

**Feature Branch**: `005-ci-github-workflow`  
**Created**: 2026-04-13  
**Status**: Draft  
**Input**: User description: "I want to use github workflow in my project to run all e2e and unit tests when main branch is updated"

## Clarifications

### Session 2026-04-13

- Q: What triggers the workflow? → A: Pushes to `main` and pull requests targeting `main`.
- Q: Should e2e tests run against the hosted Supabase instance or a local one? → A: Hosted Supabase. The project currently uses a hosted Supabase instance for e2e tests, and the workflow will use the same approach via secrets.
- Q: Should the workflow block merges (branch protection)? → A: Out of scope for this feature. The workflow will report status checks; branch protection rules can be configured later.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unit Tests Run on Every Push to Main (Priority: P1)

As a developer, I want unit tests (Vitest) to automatically run whenever code is pushed to the `main` branch or a pull request targets `main`, so that regressions are caught before they reach production.

**Why this priority**: Unit tests are fast, have no external dependencies, and form the first line of defense against regressions. They must always pass.

**Independent Test**: After merging a PR with a failing unit test, the GitHub Actions workflow reports a failing status check.

**Acceptance Scenarios**:

1. **Given** a push to `main`, **When** the workflow triggers, **Then** `npm test` runs successfully and the status check is reported.
2. **Given** a PR targeting `main` with a broken unit test, **When** the workflow runs, **Then** the unit test job fails and the PR shows a red status check.

---

### User Story 2 - E2E Tests Run on Every Push to Main (Priority: P1)

As a developer, I want Playwright e2e tests to automatically run whenever code is pushed to the `main` branch or a pull request targets `main`, so that critical user journeys are validated continuously.

**Why this priority**: E2e tests cover critical financial flows. The constitution mandates e2e coverage for critical user journeys, so CI enforcement is essential.

**Independent Test**: After merging code that breaks a critical flow, the e2e job fails and surfaces the failure clearly.

**Acceptance Scenarios**:

1. **Given** a push to `main`, **When** the workflow triggers, **Then** Playwright tests run against the hosted Supabase instance and the status check is reported.
2. **Given** the e2e tests fail, **When** a developer views the workflow run, **Then** Playwright HTML report and video artifacts are available for download.

---

### User Story 3 - Linting Runs as Part of CI (Priority: P2)

As a developer, I want ESLint and Prettier checks to run in CI so that code style is enforced consistently.

**Acceptance Scenarios**:

1. **Given** a push with formatting issues, **When** the workflow runs, **Then** the lint job fails and reports the issues.

---

### User Story 4 - Build Verification (Priority: P2)

As a developer, I want `next build` to run in CI so that type errors and build failures are caught before deployment.

**Acceptance Scenarios**:

1. **Given** a push with a TypeScript error, **When** the workflow runs, **Then** the build job fails.

## Out of Scope

- Branch protection rules configuration
- Deployment workflows
- Caching optimizations (can be added later)
- Local Supabase setup for CI (uses hosted instance)
- Notifications (Slack, email, etc.)
