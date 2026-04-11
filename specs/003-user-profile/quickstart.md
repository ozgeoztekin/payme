# Quickstart: User Profile

**Feature**: 003-user-profile  
**Date**: 2026-04-12  
**Purpose**: Setup and development instructions for the User Profile feature.

---

## Prerequisites

The User Profile feature builds on top of the existing PayMe application. Ensure the base project is running:

1. **Node.js** 18+ and npm installed
2. **Supabase** local instance running (or remote project configured)
3. **Environment variables** configured in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`

## Database

**No migration needed.** The User Profile feature operates entirely on existing tables:
- `public.users` — profile data (email, phone, status)
- `public.audit_logs` — audit entries for phone add and logout

The `public.users` table already has:
- `phone text UNIQUE` column
- `email text UNIQUE` column
- `CHECK (email IS NOT NULL OR phone IS NOT NULL)` identity integrity constraint
- `status CHECK IN ('active', 'inactive')` for active/inactive state
- RLS policies for authenticated SELECT and UPDATE on own row

If starting from scratch, run existing migrations:

```bash
# Apply all existing migrations
supabase db reset
# Or apply migrations individually
supabase migration up
```

## Development

```bash
# Start dev server
npm run dev

# Run unit tests (Vitest)
npm test

# Run unit tests in watch mode
npm run test:watch

# Run E2E tests (Playwright — requires dev server running)
npm run test:e2e

# Run linting
npm run lint
```

## Feature-Specific Files

### New Files

| File | Purpose |
|------|---------|
| `src/app/(auth)/profile/page.tsx` | Profile page (Server Component) |
| `src/app/(auth)/profile/loading.tsx` | Loading skeleton |
| `src/components/profile/profile-info.tsx` | Read-only email + phone display |
| `src/components/profile/add-phone-form.tsx` | Phone number add form |
| `src/components/profile/logout-button.tsx` | Logout action button |
| `src/lib/actions/profile-actions.ts` | `addPhoneNumber` server action |
| `src/lib/validators/profile-validators.ts` | `addPhoneSchema` Zod schema |
| `tests/unit/validators/profile-validators.test.ts` | Phone validator unit tests |
| `tests/unit/services/profile-service.test.ts` | Profile service unit tests |
| `tests/e2e/profile.spec.ts` | E2E: view, add phone, logout, auth redirect |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/services/profile-service.ts` | Add `getProfile`, `addPhoneNumber` functions |
| `src/lib/actions/auth-actions.ts` | Add audit logging to `signOut` |
| `src/lib/types/domain.ts` | Add `PHONE_ADDED`, `USER_LOGOUT` to `AuditAction` |
| `src/lib/types/api.ts` | Add `AddPhoneInput` type |
| `src/components/layout/app-sidebar.tsx` | Add Profile nav item |

## Testing the Feature

### Manual Testing

1. **View Profile**: Sign in → click Profile tab → verify email is displayed read-only
2. **Add Phone (active user)**: On Profile page → enter valid E.164 phone (e.g., `+15551234567`) → click Save → verify phone appears read-only with success message
3. **Add Phone validation**: Try invalid formats (`1234`, `+0123`), duplicate numbers → verify error messages
4. **Inactive user**: Set a user's status to `'inactive'` in DB → navigate to Profile → verify add-phone form is hidden with explanation message
5. **Logout**: On Profile page → click Logout → verify redirect to login page → verify protected pages are inaccessible
6. **Unauthenticated redirect**: Open `/profile` in incognito → verify redirect to `/login`

### Automated Testing

```bash
# Unit tests for profile feature
npm test -- --grep "profile"

# E2E tests for profile feature
npx playwright test tests/e2e/profile.spec.ts

# Full test suite
npm test && npm run test:e2e
```

## Test Users (from seed data)

The existing seed data includes two test users (Alice and Bob). Both are `active` by default and may or may not have phone numbers depending on the seed. For testing inactive scenarios, temporarily update a user's status:

```sql
-- Make a user inactive for testing
UPDATE public.users SET status = 'inactive' WHERE email = 'alice@example.com';

-- Restore to active
UPDATE public.users SET status = 'active' WHERE email = 'alice@example.com';
```

## Verification Checklist

- [ ] Profile tab visible in navigation (desktop sidebar + mobile bottom nav)
- [ ] Profile page displays email read-only
- [ ] Profile page shows phone (or "no phone" indicator)
- [ ] Active user can add phone with E.164 validation
- [ ] Phone uniqueness enforced (try same number on two users)
- [ ] Inactive user sees explanation, cannot add phone
- [ ] Logout redirects to login, session is ended
- [ ] Unauthenticated access redirects to login
- [ ] Audit logs written for phone add and logout (check `audit_logs` table)
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Responsive layout works on 320px–1440px viewports
