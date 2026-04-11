# Feature Specification: Remove Settings Page and Consolidate into Wallet

**Feature Branch**: `002-remove-settings`
**Created**: 2026-04-11
**Status**: Draft
**Input**: Architectural simplification — the standalone Settings page serves only bank-account management, which belongs alongside wallet and balance context.

## Motivation

The `/settings` page currently has a single responsibility: managing the connected bank account (view, connect, disconnect, replace). The `/wallet` page already displays the connected bank alongside wallet balance and top-up. Having two separate pages creates unnecessary navigation, duplicates the `BankAccountCard` component, and forces users to leave the Wallet to manage the bank account that funds it.

Consolidating bank management into the Wallet page:

- Eliminates a redundant page and navigation item
- Puts bank connect/disconnect next to the financial context where users need it
- Removes the "Go to Settings" indirection from the wallet empty state
- Simplifies the app shell from 4 nav items to 3

## Scope

### In scope

- Merge the Settings page's bank management UI (`BankConnectFlow`, `BankAccountCard` with replace/disconnect) into the Wallet page
- Remove the Settings page route (`src/app/(auth)/settings/`)
- Add a permanent redirect from `/settings` to `/wallet` for bookmarks and external links
- Remove Settings from the sidebar/bottom navigation
- Update all internal links and copy that reference `/settings`
- Update affected E2E tests
- Clean up orphaned code (`useBank` hook, `/api/bank` route if solely consumed by Settings)

### Out of scope

- Database or migration changes
- API contract changes (bank connect/disconnect server actions are unchanged)
- Public pay flow (`/pay/[token]`) or guest payment flow changes
- Bank service or bank actions layer changes
- New features or UI redesigns beyond the consolidation

## Current State

### Settings page (`/settings`)

- **Route**: `src/app/(auth)/settings/page.tsx` + `loading.tsx`
- **UI**: Heading "Settings", subheading "Manage your connected bank account"
- **When bank connected**: `BankAccountCard` (view + disconnect) + `BankConnectFlow` ("Replace with a different bank")
- **When no bank**: `BankConnectFlow` alone
- **Data**: `useBank` hook → `GET /api/bank`

### Wallet page (`/wallet`)

- **Route**: `src/app/(auth)/wallet/page.tsx` + `loading.tsx`
- **UI**: Heading "Wallet", `WalletBalance`, `TopUpForm`, `BankAccountCard` (with disconnect via `onDisconnected`)
- **When no bank**: `EmptyState` with "Go to Settings" CTA → `router.push('/settings')`
- **Data**: `useWallet` hook → `GET /api/wallet` (returns wallet + bank)

### References to `/settings` (4 locations)

1. `src/components/layout/app-sidebar.tsx` — `NAV_ITEMS` entry `{ href: '/settings' }`
2. `src/app/(auth)/wallet/page.tsx` — `router.push('/settings')` in EmptyState
3. `src/components/payment/funding-source-selector.tsx` — `<a href="/settings">` in "Connect a bank account in Settings"
4. `src/app/(auth)/settings/page.tsx` — the page itself

### Affected tests

- `tests/e2e/wallet-topup.spec.ts` — asserts "Go to Settings" button when no bank is connected

## Acceptance Criteria

1. **Given** a signed-in user on `/wallet` with no bank connected, **When** the page loads, **Then** the `BankConnectFlow` form is displayed inline (no redirect to Settings).
2. **Given** a signed-in user on `/wallet` with a bank connected, **When** the page loads, **Then** the full bank management UI is shown: `BankAccountCard` with disconnect capability and `BankConnectFlow` for replacing the bank.
3. **Given** a user who disconnects their bank on the Wallet page, **When** the disconnect completes, **Then** the page updates to show the `BankConnectFlow` inline and the top-up form is hidden.
4. **Given** a user who connects a bank on the Wallet page, **When** the connect completes, **Then** the page updates to show the bank card, the replacement flow, and the top-up form becomes usable.
5. **Given** any user or bookmark navigating to `/settings`, **When** the request is made, **Then** they are permanently redirected to `/wallet`.
6. **Given** the app navigation (sidebar and mobile bottom nav), **When** rendered, **Then** there is no "Settings" link — only Dashboard, New Request, and Wallet.
7. **Given** the funding source selector on the request detail page when no bank is connected, **When** rendered, **Then** the guidance text links to `/wallet` (not `/settings`).
8. **Given** the E2E test suite, **When** all tests run, **Then** all tests pass with updated assertions reflecting the inline bank management on the Wallet page.

## Constitution Check

This feature is a pure UI consolidation (removing a page, merging its components into an existing page, updating navigation and links). It does not introduce financial mutations, new data models, or security boundaries. Alignment with constitution principles:

- **I. Financial Integrity**: No monetary values are created, moved, or stored. N/A.
- **II. Atomic Operations**: No state-changing financial operations. N/A.
- **III. Auditability**: No critical business actions introduced. N/A.
- **IV. Backend Validation**: No new mutations or endpoints. Existing bank connect/disconnect server actions are unchanged. Compliant.
- **V. UX Quality**: Wallet page must handle loading, success, error, empty, and disabled states for the newly inlined bank management UI. The existing `useWallet` hook and component patterns already cover these. Compliant.
- **VI. Testing Discipline**: Affected E2E tests are updated as part of scope. Compliant.
- **VII. Simplicity**: This change reduces page count, navigation items, and removes a redundant hook and API route. Directly supports this principle.
- **VIII. Documentation**: Spec and tasks are the source of truth for this change. Compliant.

**Plan artifact waiver**: A separate `plan.md` is omitted for this feature. The change involves no architectural decisions, no new data models, no new API contracts, and no technology choices — it is a mechanical consolidation of existing UI. The Constitution Check is embedded here in lieu of a plan-level gate.

## Dependencies

- **Depends on**: 001-p2p-payment-requests (all phases complete)
- **Blocks**: Nothing — this is an independent simplification
