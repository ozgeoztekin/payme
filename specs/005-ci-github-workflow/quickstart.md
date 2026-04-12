# Quickstart: CI/CD with GitHub Actions

**Feature**: 005-ci-github-workflow  
**Date**: 2026-04-13

## Prerequisites

1. A GitHub repository for the PayMe project
2. Admin access to the repository (to configure secrets)

## Setup Steps

### 1. Configure GitHub Repository Secrets

Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add:

| Secret | Value |
|--------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |

### 2. Verify the Workflow File

After implementation, the workflow file will be at `.github/workflows/ci.yml`. It triggers on:
- Pushes to `main`
- Pull requests targeting `main`

### 3. Test the Workflow

Push a commit to `main` or open a PR targeting `main`. Verify:

1. **Lint job** (`CI / lint`): ESLint and Prettier checks pass — runs in parallel with unit tests and build
2. **Unit test job** (`CI / unit-test`): Vitest runs all unit tests
3. **Build job** (`CI / build`): `next build` succeeds (requires the three `NEXT_PUBLIC_*` / URL secrets above)
4. **E2E test job** (`CI / e2e-test`): Playwright tests run against hosted Supabase — runs after `build` succeeds; requires all four secrets

### 4. Review Failed Runs

If e2e tests fail or you need traces/videos:

1. Go to the workflow run in GitHub Actions
2. Download artifacts (uploaded whenever the job is not cancelled):
   - **`playwright-report`**: HTML report (screenshots, traces)
   - **`test-results`**: Playwright output directory (videos, attachments)
3. Open the HTML report from `playwright-report` locally to inspect failures

## Local Verification

Before pushing, you can run the same checks locally:

```bash
# Lint
npm run lint

# Unit tests
npm test

# Build
npm run build

# E2E tests (requires dev server running)
npm run test:e2e
```

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| E2E tests fail with "Missing env" | Verify all 4 secrets are set in GitHub repository settings |
| Playwright browser install fails | The workflow installs `chromium` only; ensure `npx playwright install --with-deps chromium` step is present |
| Build fails in CI but works locally | Check that `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_APP_URL` are set on the `build` job |
| No artifact to download | Artifacts are skipped if folders are missing (`if-no-files-found: ignore`); failed runs usually still produce `playwright-report` and/or `test-results` |
