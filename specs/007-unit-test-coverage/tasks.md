# 007 – Unit Test Coverage ≥ 90%

Baseline: 42% statements / 41% lines. Final: 99% statements / 100% lines.

## Phase 1: Pure-Logic & Utility Tests

- [X] T1: Add tests for `src/lib/rate-limit.ts` (checkRateLimit, getClientIp)
- [X] T2: Add tests for `src/lib/utils.ts` (formatMinor, cn)
- [X] T3: Add tests for `src/lib/validators/common-validators.ts` (all schemas)
- [X] T4: Add tests for `src/lib/db/transactions.ts` (processPaymentTransaction, processTopUpTransaction)

## Phase 2: Service Coverage Gaps

- [X] T5: Add tests for `src/lib/services/audit-service.ts` (createAuditLog)
- [X] T6: Add tests for `src/lib/services/bank-service.ts` (getBankAccount, connectBankAccount)
- [X] T7: Improve `src/lib/services/request-service.ts` coverage (declineRequest success, cancelRequest success/not-requester, createRequest branches)
- [X] T8: Improve `src/lib/services/profile-service.ts` coverage (ensureProfile, addPhoneNumber edge cases)

## Phase 3: Server Action Tests

- [X] T9: Add tests for `src/lib/actions/auth-actions.ts` (signIn, signUp, signOut)
- [X] T10: Add tests for `src/lib/actions/bank-actions.ts` (connectBankAccount, disconnectBankAccount)
- [X] T11: Add tests for `src/lib/actions/payment-actions.ts` (payRequest)
- [X] T12: Add tests for `src/lib/actions/profile-actions.ts` (addPhoneNumber)
- [X] T13: Add tests for `src/lib/actions/request-actions.ts` (createRequest, declineRequest, cancelRequest)
- [X] T14: Add tests for `src/lib/actions/wallet-actions.ts` (topUpWallet)

## Phase 4: Infrastructure & Threshold

- [X] T15: Add tests for db/client.ts, supabase/server.ts, supabase/middleware.ts, supabase/client.ts
- [X] T16: Configure vitest coverage threshold at 90% and verify ≥ 90%
