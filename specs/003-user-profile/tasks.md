# Tasks: User Profile

**Input**: Design documents from `/specs/003-user-profile/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Included — plan.md project structure explicitly lists unit and E2E test files.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared types, validators, and service foundations that multiple user stories depend on

- [ ] T001 [P] Add `PHONE_ADDED` and `USER_LOGOUT` to `AuditAction` in `src/lib/types/domain.ts`
- [ ] T002 [P] Add `AddPhoneInput` interface to `src/lib/types/api.ts`
- [ ] T003 [P] Create `addPhoneSchema` Zod validator in `src/lib/validators/profile-validators.ts` (imports `phoneSchema` from `common-validators.ts`, applies `.trim()` then E.164 validation)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Profile service functions that MUST be complete before ANY user story UI can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Add `getProfile(userId)` function to `src/lib/services/profile-service.ts` — query `public.users` by ID via `supabaseAdmin`, return `ActionResult<UserRow>` with `{ id, email, phone, status, display_name }`
- [ ] T005 Add `addPhoneNumber(userId, phone)` function to `src/lib/services/profile-service.ts` — validate active status, phone IS NULL, execute atomic UPDATE with `WHERE id = $userId AND phone IS NULL AND status = 'active'`, catch unique constraint violation, write `profile.phone_added` audit log on success, return `ActionResult<{ phone: string }>`

**Checkpoint**: Profile service ready — user story implementation can now begin

---

## Phase 3: User Story 1 — View Profile Information (Priority: P1) MVP

**Goal**: A signed-in user can navigate to the Profile tab and see their email (read-only) and phone number (or absence indicator). Inactive users see profile read-only with no add-phone path.

**Independent Test**: Sign in → click Profile tab → verify email displayed read-only and phone (or "no phone" indicator) shown correctly. Inactive user sees explanation message.

### Tests for User Story 1

- [ ] T006 [P] [US1] Create unit tests for `getProfile` in `tests/unit/services/profile-service.test.ts` — test user found (with phone, without phone), user not found

### Implementation for User Story 1

- [ ] T007 [P] [US1] Add Profile nav item to `NAV_ITEMS` in `src/components/layout/app-sidebar.tsx` — href `/profile`, label "Profile", icon "user", positioned last; add `user` case to `NavIcon` switch with a person SVG icon
- [ ] T008 [US1] Create Profile page Server Component at `src/app/(auth)/profile/page.tsx` — call `createClient()`, get authenticated user, call `getProfile(user.id)`, pass profile data to child components; render `ProfileInfo` and conditionally `AddPhoneForm` (active + no phone) or inactive explanation or `LogoutButton`
- [ ] T009 [P] [US1] Create loading skeleton at `src/app/(auth)/profile/loading.tsx` — Tailwind-styled skeleton placeholders for profile info and action areas
- [ ] T010 [US1] Create `ProfileInfo` component at `src/components/profile/profile-info.tsx` — display email read-only, display phone read-only if present, show "No phone number added" indicator if absent; handle active vs inactive messaging per FR-006

**Checkpoint**: User Story 1 complete — Profile tab visible in nav, profile page shows identity info read-only with correct active/inactive behavior

---

## Phase 4: User Story 2 — Add a Phone Number (Priority: P2)

**Goal**: An active signed-in user without a phone number can add one from the Profile page with full validation, uniqueness enforcement, success/error feedback, and audit logging.

**Independent Test**: Navigate to Profile as active user without phone → enter valid E.164 phone → save → verify phone appears read-only with success message. Test invalid format, duplicate number, inactive user rejection.

### Tests for User Story 2

- [ ] T011 [P] [US2] Create unit tests for `addPhoneSchema` in `tests/unit/validators/profile-validators.test.ts` — valid E.164, invalid format, empty string, whitespace trimming, missing plus sign, too short, too long
- [ ] T012 [P] [US2] Add unit tests for `addPhoneNumber` service to `tests/unit/services/profile-service.test.ts` — successful add, duplicate phone (unique constraint), inactive user rejection, user already has phone (overwrite prevention)

### Implementation for User Story 2

- [ ] T013 [US2] Create `addPhoneNumber` server action in `src/lib/actions/profile-actions.ts` — `'use server'`, parse input with `addPhoneSchema`, get authenticated user, call `addPhoneNumber` service, revalidate `/profile` path on success, return `ActionResult`
- [ ] T014 [US2] Create `AddPhoneForm` client component at `src/components/profile/add-phone-form.tsx` — phone input field, save button, client-side E.164 hint, loading/disabled state during submission (FR-024/FR-029), success confirmation (FR-012/FR-025), error display with specific messages (FR-026), call `addPhoneNumber` server action on submit

**Checkpoint**: User Story 2 complete — active users can add phone with validation, uniqueness, audit log, and full UX states

---

## Phase 5: User Story 3 — Log Out (Priority: P3)

**Goal**: A signed-in user can log out from the Profile page, ending their session with a redirect to login and an audit log entry.

**Independent Test**: Navigate to Profile → click Logout → verify redirect to login page → confirm protected pages are inaccessible.

### Implementation for User Story 3

- [ ] T015 [US3] Enhance `signOut` function in `src/lib/actions/auth-actions.ts` — before calling `supabase.auth.signOut()`, get current user via `supabase.auth.getUser()`, if user exists write `user.logout` audit log via `createAuditLog` using `supabaseAdmin` (do not block logout if audit fails), then sign out and redirect
- [ ] T016 [US3] Create `LogoutButton` client component at `src/components/profile/logout-button.tsx` — button triggers `signOut` action, shows loading state during action, clear reliable UX per FR-030

**Checkpoint**: User Story 3 complete — logout works from Profile with audit logging and clean redirect

---

## Phase 6: User Story 4 — Unauthenticated Access Prevention (Priority: P4)

**Goal**: Unauthenticated users accessing `/profile` are redirected to login with no profile data exposure.

**Independent Test**: Open `/profile` in unauthenticated session → verify redirect to `/login` with no profile data visible.

### Implementation for User Story 4

- [ ] T017 [US4] Verify existing `(auth)` layout redirect covers `/profile` — confirm the `src/app/(auth)/layout.tsx` authentication guard redirects unauthenticated users to `/login` before any profile data renders; add test scenario in E2E (T018)

**Checkpoint**: User Story 4 complete — unauthenticated access is blocked by existing auth layout

---

## Phase 7: E2E Tests

**Purpose**: End-to-end tests covering all user stories as integrated flows

- [ ] T018 Create E2E test suite at `tests/e2e/profile.spec.ts` — scenarios: (1) view profile with email displayed read-only, (2) view profile with existing phone shown read-only, (3) active user adds phone successfully with success message, (4) phone validation error for invalid format, (5) logout redirects to login, (6) unauthenticated user redirected to login from `/profile`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Responsive design verification, cleanup, and final validation

- [ ] T019 Verify responsive layout of Profile page across 320px–1440px viewports per FR-027/SC-005 — ensure all components (ProfileInfo, AddPhoneForm, LogoutButton) are fully usable on mobile and desktop
- [ ] T020 Run full test suite (`npm test && npm run lint`) and fix any issues
- [ ] T021 Run quickstart.md verification checklist — confirm all items pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately; all three tasks are parallel
- **Foundational (Phase 2)**: Depends on T001, T002, T003 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 completion (needs `getProfile`)
- **US2 (Phase 4)**: Depends on Phase 2 completion (needs `addPhoneNumber` service) and US1 (needs profile page structure)
- **US3 (Phase 5)**: Depends on US1 (needs profile page to host logout button)
- **US4 (Phase 6)**: Independent of other stories (uses existing auth layout) but logical to verify after page exists
- **E2E Tests (Phase 7)**: Depends on US1–US4 completion
- **Polish (Phase 8)**: Depends on all stories and E2E tests complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependency on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) — depends on US1 page structure for form placement
- **User Story 3 (P3)**: Can start after US1 — depends on profile page existing to host logout button
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) — relies on existing `(auth)` layout, independent of other stories

### Within Each User Story

- Tests can be written in parallel with or before implementation
- Service functions before server actions
- Server actions before UI components
- Components integrate into page last

### Parallel Opportunities

- T001, T002, T003 are fully parallel (different files)
- T006, T007, T009 are parallel (different files, all within US1 phase)
- T011, T012 are parallel (different test files)
- T013 and T014 are sequential (action before form component that uses it)
- T015 and T016 are sequential (action enhancement before button component)

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all setup tasks together (all different files):
Task: "Add PHONE_ADDED and USER_LOGOUT to AuditAction in src/lib/types/domain.ts"
Task: "Add AddPhoneInput interface to src/lib/types/api.ts"
Task: "Create addPhoneSchema in src/lib/validators/profile-validators.ts"
```

## Parallel Example: User Story 1

```bash
# Launch parallelizable US1 tasks together:
Task: "Add Profile nav item to src/components/layout/app-sidebar.tsx"
Task: "Create loading skeleton at src/app/(auth)/profile/loading.tsx"
Task: "Create unit tests for getProfile in tests/unit/services/profile-service.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003, parallel)
2. Complete Phase 2: Foundational (T004–T005, sequential)
3. Complete Phase 3: User Story 1 (T006–T010)
4. **STOP and VALIDATE**: Profile page shows identity info, nav link works
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (phone add works)
4. Add User Story 3 → Test independently → Deploy/Demo (logout with audit)
5. Add User Story 4 → Verify auth guard → Deploy/Demo
6. E2E tests + Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- No database migrations needed — feature uses existing `public.users` and `audit_logs` tables
- Existing `phoneSchema` from `common-validators.ts` is reused (not recreated)
- Existing `signOut` in `auth-actions.ts` is enhanced (not replaced)
- Existing `ensureProfile` in `profile-service.ts` is preserved
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
