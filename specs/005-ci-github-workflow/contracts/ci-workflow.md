# Contract: CI Workflow Definition

**Feature**: 005-ci-github-workflow  
**Date**: 2026-04-13

## Workflow Trigger Contract

The CI workflow activates on:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

## Job Contract

### Job: `lint`
- **Runs on**: `ubuntu-latest`
- **Node**: 20.x
- **Steps**: `npm ci` → `npm run lint`
- **Expected exit 0 when**: ESLint and Prettier report no issues

### Job: `unit-test`
- **Runs on**: `ubuntu-latest`
- **Node**: 20.x
- **Steps**: `npm ci` → `npm test`
- **Expected exit 0 when**: All Vitest unit tests pass

### Job: `build`
- **Runs on**: `ubuntu-latest`
- **Node**: 20.x
- **Environment variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`
- **Steps**: `npm ci` → `npm run build`
- **Expected exit 0 when**: Next.js build compiles without errors

### Job: `e2e-test`
- **Runs on**: `ubuntu-latest`
- **Node**: 20.x
- **Depends on**: `build`
- **Environment variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`
- **Steps**: `npm ci` → `npx playwright install --with-deps chromium` → `npm run test:e2e`
- **Artifacts on failure**: `playwright-report/` directory uploaded as `playwright-report`
- **Expected exit 0 when**: All Playwright e2e tests pass

## Status Check Names

| Job | GitHub Status Check Name |
|-----|-------------------------|
| lint | `CI / lint` |
| unit-test | `CI / unit-test` |
| build | `CI / build` |
| e2e-test | `CI / e2e-test` |
