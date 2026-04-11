# Tasks: Remove Settings Page and Consolidate into Wallet

**Input**: Design documents from `/specs/002-remove-settings/`
**Prerequisites**: All phases of 001-p2p-payment-requests complete

**Tests**: Updates to existing E2E tests (no new test suites).

**Organization**: Tasks are grouped into phases that should be executed sequentially. Within each phase, tasks marked [P] can run in parallel.

## Format: `[ID] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in this phase)
- All file paths are relative to repository root

---

## Phase 1: Enhance Wallet Page with Bank Management

**Purpose**: Merge the Settings page's bank connect/disconnect/replace UI into the Wallet page so it becomes the single location for all bank and balance management.

**Plan references**: spec.md Acceptance Criteria 1–4

- [ ] T100 Update `src/app/(auth)/wallet/page.tsx`: import `BankConnectFlow` and, when no bank is connected, replace the `EmptyState` "Go to Settings" CTA with an inline `BankConnectFlow` component that calls `refetch` on connect. Use `useWallet`'s `refetch()` for all state updates (no need for `useBank` or `setBankAccount`).
- [ ] T101 Update `src/app/(auth)/wallet/page.tsx`: when a bank is connected, expand the "Connected Bank" section to include `BankConnectFlow` with "Replace with a different bank" label (matching the Settings page pattern) alongside the existing `BankAccountCard`. Use `refetch` on connect to refresh state.
- [ ] T102 Verify the existing `BankAccountCard.onDisconnected → refetch` wiring in the Wallet page works correctly with the new layout: when the user disconnects, `bankAccount` becomes `null`, the top-up form hides, and the inline `BankConnectFlow` from T100 appears (no code change expected — confirm behavior after T100/T101)
- [ ] T104 Update the Wallet page heading/subheading to reflect the expanded scope (e.g. "Manage your balance, bank account, and top-ups")

**Checkpoint**: Wallet page is self-contained for bank management — no link to Settings needed.

---

## Phase 2: Remove Settings Page and Add Redirect

**Purpose**: Delete the now-redundant Settings route and ensure existing bookmarks/links still work via a permanent redirect.

**Plan references**: spec.md Acceptance Criteria 5

- [ ] T105 Delete `src/app/(auth)/settings/page.tsx`
- [ ] T106 Delete `src/app/(auth)/settings/loading.tsx`
- [ ] T107 Add a permanent redirect from `/settings` to `/wallet` in `next.config.ts` using the `redirects()` configuration (301 Moved Permanently — appropriate since only GET requests are expected for a page route)

**Checkpoint**: `/settings` no longer renders a page; it redirects to `/wallet`.

---

## Phase 3: Update Navigation

**Purpose**: Remove the Settings entry from all navigation surfaces.

**Plan references**: spec.md Acceptance Criteria 6

- [ ] T108 Remove the `{ href: '/settings', label: 'Settings', icon: 'settings' }` entry from `NAV_ITEMS` in `src/components/layout/app-sidebar.tsx`
- [ ] T109 Remove the `case 'settings'` SVG from the `NavIcon` component in `src/components/layout/app-sidebar.tsx`

**Checkpoint**: Sidebar (desktop) and bottom nav (mobile) show 3 items: Dashboard, New Request, Wallet.

---

## Phase 4: Update Internal Links and Copy

**Purpose**: Replace all remaining references to `/settings` across the app with `/wallet` or remove them.

**Plan references**: spec.md Acceptance Criteria 7

- [ ] T110 Update `src/components/payment/funding-source-selector.tsx` lines 150–158: change the `<a href="/settings">` link to `/wallet` and update the copy from "Connect a bank account in Settings" to "Connect a bank account in your Wallet"

**Checkpoint**: No references to `/settings` remain in application source code (excluding the redirect in `next.config.ts`).

---

## Phase 5: Update Tests

**Purpose**: Fix E2E tests that reference the removed Settings page or the old "Go to Settings" CTA.

**Plan references**: spec.md Acceptance Criteria 8

- [ ] T111 Update `tests/e2e/wallet-topup.spec.ts` "shows guidance when no bank account is connected" test: replace the assertion for `getByRole('button', { name: /go to settings/i })` with an assertion that the inline `BankConnectFlow` UI is visible (e.g. assert a bank selection element or the connect form heading is present)
- [ ] T112 Run `npm run test:e2e` and verify all E2E test suites pass with the changes

**Checkpoint**: Full E2E suite green.

---

## Phase 6: Cleanup

**Purpose**: Remove orphaned code that was only used by the deleted Settings page.

- [ ] T113 Delete `src/hooks/use-bank.ts` (only imported by the deleted Settings page)
- [ ] T114 Delete `src/app/api/bank/route.ts` (only called by the deleted `use-bank.ts` hook)
- [ ] T115 [P] Update `src/app/(auth)/wallet/loading.tsx` skeleton to reflect the new bank management section layout
- [ ] T116 Run `npm test && npm run lint` and verify no errors from removed imports or dead references

**Checkpoint**: No orphaned code, all checks pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** (Enhance Wallet): No dependencies within this spec — start immediately
- **Phase 2** (Remove Settings): Depends on Phase 1 — Wallet must be self-contained before deleting Settings
- **Phase 3** (Navigation): Should follow Phase 2 for cleanliness — avoids a briefly dead nav link
- **Phase 4** (Internal Links): Can run in parallel with Phase 3
- **Phase 5** (Tests): Depends on Phases 1–4 — all code changes must be in place
- **Phase 6** (Cleanup): Depends on Phase 2 — Settings page must be deleted first

### Recommended Sequence

```
Phase 1 → Phase 2 → Phase 3 + Phase 4 (parallel) → Phase 5 → Phase 6
```

---

## Files Affected (Summary)

| Action | File |
|--------|------|
| Modify | `src/app/(auth)/wallet/page.tsx` |
| Modify | `src/app/(auth)/wallet/loading.tsx` |
| Modify | `src/components/layout/app-sidebar.tsx` |
| Modify | `src/components/payment/funding-source-selector.tsx` |
| Modify | `tests/e2e/wallet-topup.spec.ts` |
| Modify | `next.config.ts` |
| Delete | `src/app/(auth)/settings/page.tsx` |
| Delete | `src/app/(auth)/settings/loading.tsx` |
| Delete | `src/hooks/use-bank.ts` |
| Delete | `src/app/api/bank/route.ts` |

---

## Summary

| Metric | Count |
|--------|-------|
| **Total tasks** | 16 |
| **Phase 1 (Enhance Wallet)** | 4 |
| **Phase 2 (Remove Settings)** | 3 |
| **Phase 3 (Navigation)** | 2 |
| **Phase 4 (Internal Links)** | 1 |
| **Phase 5 (Tests)** | 2 |
| **Phase 6 (Cleanup)** | 4 |
