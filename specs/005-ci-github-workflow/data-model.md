# Data Model: CI/CD with GitHub Actions

**Feature**: 005-ci-github-workflow  
**Date**: 2026-04-13

## Overview

This feature introduces no new database tables, columns, or application-level data models. It is a pure infrastructure/DevOps feature that adds a GitHub Actions workflow configuration file.

## Configuration Artifacts

### GitHub Actions Workflow

| Artifact | Location | Format |
|----------|----------|--------|
| CI workflow | `.github/workflows/ci.yml` | YAML (GitHub Actions) |

### Required GitHub Repository Secrets

| Secret Name | Description | Required By |
|-------------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | E2E tests, Build |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | E2E tests, Build |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (admin) | E2E global setup |
| `NEXT_PUBLIC_APP_URL` | Application URL (http://localhost:3000 in CI) | E2E tests |

## State Transitions

### Workflow Job Dependencies

```
push/PR to main
    │
    ├── lint (independent)
    │
    ├── unit-test (independent)
    │
    ├── build (independent)
    │
    └── e2e-test (depends on: build)
```

- `lint`, `unit-test`, and `build` run in parallel immediately.
- `e2e-test` waits for `build` to succeed before running (ensures the app compiles before expensive browser tests).
