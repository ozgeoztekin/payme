# Research: User Profile

**Feature**: 003-user-profile  
**Date**: 2026-04-12  
**Purpose**: Resolve all technical unknowns and design decisions before implementation.

---

## Decision 1: Database Schema Changes

**Question**: Does the existing schema support the Profile feature, or do we need a migration?

**Decision**: No migration needed. Reuse existing `public.users` table as-is.

**Rationale**: The `public.users` table already has:
- `phone text` column with `UNIQUE` constraint (`users_phone_unique`)
- `email text` column with `UNIQUE` constraint (`users_email_unique`)
- `CHECK (email IS NOT NULL OR phone IS NOT NULL)` — identity integrity
- `status text CHECK (status IN ('active', 'inactive'))` — active/inactive state
- Index on `phone` for lookup performance
- RLS policy `users_select_own` (SELECT) and `users_update_own` (UPDATE) for authenticated users

The DB trigger `handle_new_user()` (migration 003) auto-creates user + wallet on auth signup, and `ensureProfile` is a fallback safety net.

**Alternatives considered**:
- Separate `profiles` table: Rejected — adds join overhead and complexity with no benefit since `public.users` already has all needed columns.
- Add a `phone_verified` boolean column: Out of scope per Non-Goals (no SMS/OTP verification in this MVP).

---

## Decision 2: Phone Number Validation and Normalization

**Question**: How should phone numbers be validated and normalized before save?

**Decision**: Reuse the existing `phoneSchema` from `src/lib/validators/common-validators.ts` (E.164 regex: `^\+[1-9]\d{1,14}$`). Normalize by trimming whitespace before validation.

**Rationale**: The spec (Assumptions section) explicitly states: "Phone number format — Phone numbers are validated using a standard format (e.g., E.164 international format). The specific validation rules are defined by the existing product phone validation logic established in the payment request feature (FR-004 of spec 001)." This is exactly `phoneSchema`. The E.164 format is already canonical (starts with `+`, digits only), so normalization is limited to trimming whitespace. The DB unique constraint operates on the stored value.

**Alternatives considered**:
- `libphonenumber-js` for richer validation/normalization: Rejected — adds a dependency for marginal benefit in this MVP. E.164 regex is sufficient. Can be upgraded later.
- Allow non-E.164 formats and convert server-side: Rejected — spec assumes E.164 and existing payment flow uses it consistently.

---

## Decision 3: Phone Uniqueness Enforcement

**Question**: How should concurrent phone number claims be handled?

**Decision**: Rely on the DB `UNIQUE` constraint (`users_phone_unique`) as the authoritative uniqueness check. The server action catches the unique violation error from Supabase and returns a user-friendly "number already in use" message.

**Rationale**: The database constraint is the only mechanism that prevents race conditions between two concurrent claims (spec edge case: "Concurrent phone number claim"). Application-level pre-checks (SELECT before UPDATE) are advisory only and subject to TOCTOU races. The pattern is:
1. Server action receives phone number
2. Validates format (Zod schema)
3. Validates user is active and has no phone
4. Executes UPDATE with WHERE clause
5. If unique constraint violation → return "number already in use"
6. If success → return updated profile + write audit log

**Alternatives considered**:
- Pre-check with SELECT then UPDATE: Added as advisory UX improvement (early feedback) but NOT relied upon for correctness. The DB constraint is authoritative.
- Advisory lock / SELECT FOR UPDATE: Overkill — the UNIQUE constraint already handles this atomically.

---

## Decision 4: Phone Add — Update vs. Insert Strategy

**Question**: Should adding a phone be an UPDATE to the existing user row or a separate INSERT?

**Decision**: UPDATE the existing `public.users` row. The phone column is nullable; adding a phone sets it from `NULL` to a value.

**Rationale**: The user row already exists (created at signup). Phone is a column on the same row. A single `UPDATE public.users SET phone = $1, updated_at = now() WHERE id = $2 AND phone IS NULL AND status = 'active'` atomically:
- Sets the phone
- Enforces no-overwrite (WHERE phone IS NULL per FR-014)
- Enforces active status (WHERE status = 'active' per FR-034)
- Triggers unique constraint check

The WHERE conditions make this idempotent-safe — if the user already has a phone, 0 rows update and the action returns an appropriate error.

**Alternatives considered**:
- Separate phone_numbers table: Rejected per Decision 1.
- Two-step: check then update: The single UPDATE with WHERE clause is more robust and avoids race conditions.

---

## Decision 5: Profile Service Design

**Question**: Should we create a new service or extend the existing `profile-service.ts`?

**Decision**: Extend the existing `src/lib/services/profile-service.ts` with two new functions: `getProfile(userId)` and `addPhoneNumber(userId, phone)`. Keep the existing `ensureProfile` function.

**Rationale**: The file already exists for profile-related logic. Adding functions here follows the convention of other services (e.g., `request-service.ts` has create/decline/cancel). The service uses `supabaseAdmin` (bypasses RLS) for server-side operations, consistent with other services.

**Alternatives considered**:
- New `user-service.ts`: Rejected — `profile-service.ts` already exists and is the natural home for user profile operations.
- Inline logic in server action: Rejected — constitution requires centralized domain logic in services, not in actions.

---

## Decision 6: Logout Audit Logging

**Question**: How should logout audit logging work given the existing `signOut` action?

**Decision**: Enhance the existing `signOut` function in `src/lib/actions/auth-actions.ts` to write an audit log entry before calling `supabase.auth.signOut()`. Use `supabaseAdmin` for the audit write since the user's session is about to be destroyed.

**Rationale**: The audit log must be written while we still know who the actor is (the current authenticated user). After `signOut()`, the session is gone. The sequence is:
1. Get current user from session
2. Write audit log via `createAuditLog` (uses `supabaseAdmin`, not affected by session end)
3. Call `supabase.auth.signOut()`
4. Redirect to `/login`

If the user has no valid session when they hit logout, skip the audit log (nothing to audit) and just redirect.

**Alternatives considered**:
- Audit after signOut: Impossible — session is destroyed, actor ID is lost.
- Separate logout action in profile-actions: Rejected — signOut already exists in auth-actions. Adding a second signOut would duplicate logic. Enhancing the existing one is simpler.

---

## Decision 7: Navigation Integration

**Question**: Where should the Profile link appear in navigation?

**Decision**: Add a Profile nav item to `NAV_ITEMS` in `src/components/layout/app-sidebar.tsx` with href `/profile`, label "Profile", and a user icon. Position it as the last item in the nav list.

**Rationale**: The spec states (FR-001): "The system MUST provide a Profile tab in the main app navigation accessible to signed-in users." The existing sidebar + mobile bottom nav render from `NAV_ITEMS`, so adding an entry there automatically populates both desktop sidebar and mobile bottom nav. Placing Profile last keeps the primary action-oriented items (Dashboard, New Request, Wallet) prominent.

**Alternatives considered**:
- Profile in sidebar footer (replacing the email avatar): Rejected — the spec says "Profile tab in the main app navigation," not a hidden menu. The avatar area could link to profile as an additional shortcut, but the tab must exist.
- Dropdown menu from avatar: Rejected — not a "tab" as specified.

---

## Decision 8: Inactive User Phone Add Prevention

**Question**: How should inactive users be prevented from adding a phone?

**Decision**: Enforce at three layers:
1. **UI**: The `AddPhoneForm` component checks `user.status` and renders an explanation message instead of the form when inactive (FR-006).
2. **Server action**: The `addPhoneNumber` action validates `status === 'active'` before attempting the update (FR-034).
3. **Database**: The UPDATE WHERE clause includes `AND status = 'active'`, so even if the action check is bypassed, the DB won't update an inactive user's phone.

**Rationale**: Constitution Principle IV requires backend enforcement. The UI check is for UX only. The DB WHERE clause is defense-in-depth. All three layers align.

**Alternatives considered**:
- DB-only enforcement: Insufficient — would produce a generic error instead of the clear inactive-account message required by FR-034.
- UI-only enforcement: Violates Constitution Principle IV.

---

## Decision 9: Duplicate Submission Prevention

**Question**: How should rapid repeated save clicks be handled?

**Decision**: Dual approach:
1. **UI guard**: Disable the submit button and show a loading spinner during the server action call. Re-enable only on success or error response (FR-024, FR-029).
2. **Server idempotency**: The UPDATE WHERE `phone IS NULL` clause naturally rejects duplicate submissions — after the first successful save, subsequent calls find `phone IS NOT NULL` and return 0 rows affected, producing a "phone already set" response rather than an error.

**Rationale**: The UI guard handles the common case (user double-clicks). The server-side WHERE clause handles edge cases (network retry, concurrent tabs). No additional infrastructure (request IDs, dedup tables) is needed.

**Alternatives considered**:
- Idempotency token: Overkill — the WHERE clause achieves the same result with less complexity.
- Debounce on client: Not reliable for network-level retries. UI disable + server idempotency is more robust.

---

## Decision 10: Profile Page Architecture

**Question**: Should the Profile page be a Server Component or Client Component?

**Decision**: The Profile page (`page.tsx`) is a Server Component that fetches user data server-side and passes it to client components. The `AddPhoneForm` and `LogoutButton` are Client Components (they handle user interactions and form state).

**Rationale**: Consistent with other pages in the app (e.g., dashboard, wallet). Server-side data fetch provides fast initial load (SC-001: < 2 seconds), avoids client-side loading spinners for the initial view. Interactive components are client-side by necessity (form state, button handlers).

**Alternatives considered**:
- Fully client-side with useEffect fetch: Rejected — adds unnecessary loading state for initial render, inconsistent with app patterns.
- Fully server-side with form actions only: Possible but limits UX responsiveness for the add-phone flow (optimistic updates, inline error display). Hybrid approach is better.
