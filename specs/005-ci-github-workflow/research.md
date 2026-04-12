# Research: CI/CD with GitHub Actions

**Feature**: 005-ci-github-workflow  
**Date**: 2026-04-13

## Research Tasks

### 1. GitHub Actions Workflow Structure for Next.js + Playwright + Vitest

**Decision**: Use a single workflow file with multiple parallel jobs (lint, unit-test, build, e2e-test). The e2e job depends on the build job to verify the app compiles before running expensive browser tests.

**Rationale**: Parallel jobs maximize feedback speed. A single workflow file keeps CI configuration centralized and easy to maintain. Separating jobs allows developers to quickly see which stage failed.

**Alternatives considered**:
- Single sequential job: Simpler but slower; a lint failure would block test feedback.
- Multiple workflow files: More modular but adds maintenance overhead for a project this size.

### 2. Playwright in GitHub Actions

**Decision**: Use the official `mcr.microsoft.com/playwright` Docker image via the `--container` option or install Playwright browsers via `npx playwright install --with-deps chromium` in the workflow.

**Rationale**: Installing browsers directly is more straightforward for a Next.js project that needs `npm run build` and `npm run dev` in the same environment. The Playwright config already handles `process.env.CI` for retries, `forbidOnly`, and `reuseExistingServer`.

**Alternatives considered**:
- Docker container approach: Cleaner isolation but complicates Next.js dev server startup.
- Third-party Playwright actions: Adds external dependency; the official install command is sufficient.

### 3. Supabase in CI for E2E Tests

**Decision**: Use the hosted Supabase instance with secrets (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) stored as GitHub Actions secrets. The e2e global setup already creates/resets test users and seed data.

**Rationale**: The project already uses a hosted Supabase instance for development and testing. The `global-setup.ts` handles idempotent user creation and data reset, making it safe for CI runs. This avoids the complexity of spinning up a local Supabase instance in CI.

**Alternatives considered**:
- Local Supabase via Docker in CI: More isolated but requires Supabase CLI, Docker-in-Docker, and migration management in CI. Significantly more complex for minimal benefit at current scale.
- Supabase GitHub Action: Exists but is experimental and adds another dependency.

### 4. Environment Variables and Secrets Management

**Decision**: Store sensitive environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`) as GitHub repository secrets. Non-sensitive variables can be set directly in the workflow file.

**Rationale**: GitHub Actions secrets are encrypted at rest and masked in logs. The `NEXT_PUBLIC_` variables, while technically public in the browser bundle, are still best stored as secrets to avoid hardcoding environment-specific values in the workflow file.

**Alternatives considered**:
- `.env` file committed to repo: Security risk; violates best practices.
- GitHub Environments: Useful for deployment stages but overkill for a single CI environment.

### 5. Node.js Version Management in CI

**Decision**: Use `actions/setup-node@v4` with Node.js 20.x to match the project's current runtime version (v20.19.6). Enable npm caching via `cache: 'npm'`.

**Rationale**: Matching the local development Node.js version avoids subtle incompatibilities. The `setup-node` action's built-in npm cache reduces install times.

**Alternatives considered**:
- Node.js 22.x: Would introduce a version mismatch with local development.
- No caching: Slower CI runs with no benefit.

### 6. Artifact Upload for Test Reports

**Decision**: Upload Playwright HTML report and video recordings as GitHub Actions artifacts on test failure using `actions/upload-artifact@v4`. This makes debugging failed e2e tests straightforward.

**Rationale**: Playwright generates rich reports (HTML, video, trace) that are invaluable for debugging CI-only failures. The config already enables `video: 'on'` and `trace: 'on-first-retry'`.

**Alternatives considered**:
- No artifact upload: Loses debugging capability for CI-only failures.
- Always upload artifacts: Wastes storage when tests pass; upload only on failure.
