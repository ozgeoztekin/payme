# API Contracts: User Profile

**Feature**: 003-user-profile  
**Date**: 2026-04-12  
**Source**: spec.md, research.md, data-model.md

---

## Overview

The User Profile feature exposes functionality through **Next.js Server Actions** (not REST API routes). This follows the established pattern for authenticated mutations in the PayMe app (see `request-actions.ts`, `payment-actions.ts`, `wallet-actions.ts`, `bank-actions.ts`). Profile data is read server-side in the page Server Component — no GET API route is needed.

---

## Server Action: `addPhoneNumber`

**File**: `src/lib/actions/profile-actions.ts`  
**Purpose**: Add a phone number to the authenticated user's profile (FR-008–FR-012, FR-022–FR-026, FR-031, FR-034)

### Input

```typescript
interface AddPhoneInput {
  phone: string;  // Raw user input, will be trimmed and validated
}
```

### Validation (Zod schema: `addPhoneSchema`)

| Field | Rule | Error Message |
|-------|------|---------------|
| `phone` | `.trim()` then `phoneSchema` (E.164: `^\+[1-9]\d{1,14}$`) | `"Must be E.164 format (e.g., +15551234567)"` |

### Authorization

| Check | Failure Response |
|-------|-----------------|
| User is authenticated | `{ success: false, error: { code: 'UNAUTHORIZED', message: 'You must be signed in.' } }` |
| User account is active | `{ success: false, error: { code: 'INACTIVE_ACCOUNT', message: 'Adding a phone number is unavailable while your account is inactive.' } }` |
| User has no existing phone | `{ success: false, error: { code: 'PHONE_ALREADY_SET', message: 'A phone number is already associated with your account.' } }` |

### Success Response

```typescript
{
  success: true,
  data: {
    phone: string;  // The normalized, saved phone number
  }
}
```

### Error Responses

| Condition | Code | Message | HTTP-equivalent |
|-----------|------|---------|-----------------|
| Not authenticated | `UNAUTHORIZED` | `"You must be signed in."` | 401 |
| Invalid phone format | `VALIDATION_ERROR` | Zod error message | 400 |
| Account inactive | `INACTIVE_ACCOUNT` | `"Adding a phone number is unavailable while your account is inactive."` | 403 |
| Phone already set on this user | `PHONE_ALREADY_SET` | `"A phone number is already associated with your account."` | 409 |
| Phone in use by another user | `PHONE_UNAVAILABLE` | `"This phone number is already in use by another account."` | 409 |
| Unexpected server error | `INTERNAL_ERROR` | `"An unexpected error occurred. Please try again."` | 500 |

### Behavior

1. Parse and validate input with `addPhoneSchema`
2. Get authenticated user from session; fail if not authenticated
3. Fetch user profile from `public.users`; fail if not found
4. Check `status === 'active'`; fail if inactive
5. Check `phone IS NULL`; fail if already set
6. Execute: `UPDATE public.users SET phone = $phone, updated_at = now() WHERE id = $userId AND phone IS NULL AND status = 'active'`
7. If 0 rows affected → concurrent race; re-check and return appropriate error
8. If unique constraint violation → return `PHONE_UNAVAILABLE`
9. On success → write audit log (`profile.phone_added`), return saved phone
10. Revalidate the `/profile` page path

### Audit Log Entry (on success)

```json
{
  "actor_id": "<user-uuid>",
  "actor_type": "user",
  "action": "profile.phone_added",
  "target_type": "user",
  "target_id": "<user-uuid>",
  "metadata": { "phone": "+15551234567" },
  "outcome": "success"
}
```

---

## Server Action: `signOut` (Enhanced)

**File**: `src/lib/actions/auth-actions.ts` (existing, modified)  
**Purpose**: End the authenticated session and redirect to login (FR-018–FR-021, FR-032)

### Current Behavior (unchanged)

1. Create Supabase client from cookies
2. Call `supabase.auth.signOut()`
3. Redirect to `/login`

### Enhanced Behavior (added)

1. **Get current user** from session via `supabase.auth.getUser()`
2. **If user exists**: write audit log (`user.logout`) via `createAuditLog` using `supabaseAdmin`
3. Call `supabase.auth.signOut()`
4. Redirect to `/login`

### Audit Log Entry (on success)

```json
{
  "actor_id": "<user-uuid>",
  "actor_type": "user",
  "action": "user.logout",
  "target_type": "session",
  "target_id": "<user-uuid>",
  "metadata": {},
  "outcome": "success"
}
```

### Error Handling

If audit log write fails (e.g., DB error), log the error to console but **do not block** the logout. The user's signOut must still proceed. This matches the existing `createAuditLog` pattern which logs errors but doesn't throw.

---

## Server-Side Data Fetch: Profile Page

**File**: `src/app/(auth)/profile/page.tsx`  
**Purpose**: Load user profile data for the Profile page (FR-004–FR-006)

### Approach

The Profile page is a Server Component. It reads the authenticated user and their `public.users` row server-side:

```typescript
// In page.tsx (Server Component)
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
// user is guaranteed by (auth) layout redirect

const profile = await getProfile(user.id);
// Returns: { id, email, phone, status, display_name }
```

### Service Function: `getProfile(userId: string)`

**File**: `src/lib/services/profile-service.ts`

```typescript
async function getProfile(userId: string): Promise<ActionResult<UserRow>>
```

| Outcome | Response |
|---------|----------|
| User found | `{ success: true, data: UserRow }` |
| User not found | `{ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found.' } }` |

Uses `supabaseAdmin` to bypass RLS for consistent server-side reads.

---

## TypeScript Types (additions)

### `src/lib/types/api.ts`

```typescript
export interface AddPhoneInput {
  phone: string;
}
```

### `src/lib/types/domain.ts`

```typescript
// Add to existing AuditAction:
PHONE_ADDED: 'profile.phone_added',
USER_LOGOUT: 'user.logout',
```

---

## Validation Schema

### `src/lib/validators/profile-validators.ts`

```typescript
import { z } from 'zod';
import { phoneSchema } from './common-validators';

export const addPhoneSchema = z.object({
  phone: z.string().trim().pipe(phoneSchema),
});
```

The `.trim()` handles edge case of leading/trailing whitespace before E.164 validation.
