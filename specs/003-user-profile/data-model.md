# Data Model: User Profile

**Feature**: 003-user-profile  
**Date**: 2026-04-12  
**Source**: spec.md, research.md (Decision 1)

---

## Overview

The User Profile feature does **not** introduce new database tables or migrations. It operates on the existing `public.users` table, which already contains all required columns, constraints, and indexes. This document describes the relevant entities as used by this feature.

---

## Entity: User (Profile)

**Table**: `public.users`  
**Migration**: `supabase/migrations/001_initial_schema.sql` (existing)

### Fields

| Column | Type | Nullable | Default | Constraint | Profile Feature Usage |
|--------|------|----------|---------|------------|----------------------|
| `id` | `uuid` | NO | — | PK, FK → `auth.users(id)` ON DELETE CASCADE | User identity, actor_id for audit |
| `display_name` | `text` | NO | — | — | Not displayed in this MVP profile page |
| `email` | `text` | YES | — | UNIQUE (`users_email_unique`) | Displayed read-only (FR-004) |
| `phone` | `text` | YES | — | UNIQUE (`users_phone_unique`) | Displayed read-only when present (FR-005); set via add-phone flow (FR-008) |
| `status` | `text` | NO | `'active'` | CHECK IN (`'active'`, `'inactive'`) | Determines whether add-phone is allowed (FR-033, FR-034) |
| `created_at` | `timestamptz` | NO | `now()` | — | Not used by this feature |
| `updated_at` | `timestamptz` | NO | `now()` | — | Updated when phone is added |

### Table-Level Constraints

| Constraint | Expression | Feature Relevance |
|-----------|------------|-------------------|
| Identity integrity | `CHECK (email IS NOT NULL OR phone IS NOT NULL)` | FR-015: User always has at least one identifier. Prevents removing the only identifier. |
| Email uniqueness | `UNIQUE (email)` | Not directly used (email is read-only) but ensures data consistency |
| Phone uniqueness | `UNIQUE (phone)` | FR-010: Enforces phone uniqueness across all users. Authoritative for concurrent claims (research Decision 3). |

### Indexes

| Index | Column(s) | Feature Relevance |
|-------|-----------|-------------------|
| `idx_users_email` | `email` | Lookup for display |
| `idx_users_phone` | `phone` | Uniqueness check performance |

### RLS Policies

| Policy | Operation | Rule | Feature Relevance |
|--------|-----------|------|-------------------|
| `users_select_own` | SELECT | `id = auth.uid()` | Profile page reads user's own row |
| `users_update_own` | UPDATE | `id = auth.uid()` | Phone add updates user's own row |

Note: Server-side operations (profile service, audit logging) use `supabaseAdmin` which bypasses RLS.

### State Transitions

The `phone` column transitions once per user in this MVP:

```
NULL → (valid E.164 string)    [add-phone action, active users only]
```

Once set, the phone column is **immutable** through Profile feature paths (FR-013, FR-014). No Profile-exposed mutation path allows setting phone back to NULL or changing it to another value.

### Validation Rules (applied at service layer)

| Rule | Source | Implementation |
|------|--------|---------------|
| Phone format: E.164 (`^\+[1-9]\d{1,14}$`) | FR-009, Assumptions | Reuse `phoneSchema` from `common-validators.ts` |
| Phone trimmed before validation | Edge case: whitespace | `.trim()` before Zod parse |
| Phone unique across all users | FR-010 | DB UNIQUE constraint (authoritative), advisory pre-check in service |
| User must be active | FR-034 | Service checks `status === 'active'`; UPDATE WHERE includes `AND status = 'active'` |
| User must not already have a phone | FR-013, FR-014 | UPDATE WHERE includes `AND phone IS NULL` |

---

## Entity: Audit Log

**Table**: `public.audit_logs`  
**Migration**: `supabase/migrations/001_initial_schema.sql` (existing)

### New Audit Actions (added to `AuditAction` enum in `domain.ts`)

| Action Value | Trigger | Actor | Target Type | Target ID | Metadata |
|-------------|---------|-------|-------------|-----------|----------|
| `profile.phone_added` | Successful phone add | `user` (the profile owner) | `user` | User's UUID | `{ phone: "<normalized>" }` |
| `user.logout` | Successful logout | `user` (the logging-out user) | `session` | User's UUID | `{}` |

### Audit Log Fields Used

| Column | Phone Add Value | Logout Value |
|--------|----------------|--------------|
| `actor_id` | User UUID | User UUID |
| `actor_type` | `'user'` | `'user'` |
| `action` | `'profile.phone_added'` | `'user.logout'` |
| `target_type` | `'user'` | `'session'` |
| `target_id` | User UUID | User UUID |
| `metadata` | `{ phone: "+15551234567" }` | `{}` |
| `outcome` | `'success'` | `'success'` |

---

## Relationships

```
auth.users (1) ──── (1) public.users (Profile)
                          │
                          ├── (0..1) phone [nullable, unique]
                          ├── (1) email [unique]
                          └── (1) status [active|inactive]

public.users (1) ──── (0..*) public.audit_logs [via actor_id]
```

---

## No New Tables or Migrations

This feature requires **zero** database migrations. All storage needs are met by the existing schema:
- `public.users` for profile data
- `public.audit_logs` for audit entries

The only code-level changes to data-related files are:
1. **`src/lib/types/domain.ts`**: Add `PHONE_ADDED` and `USER_LOGOUT` to `AuditAction` enum
2. **`src/lib/types/api.ts`**: Add `AddPhoneInput` interface
