# API Contracts: Peer-to-Peer Payment Request Flow

**Feature Branch**: `001-p2p-payment-requests`  
**Date**: 2026-04-08  
**Plan**: [../plan.md](../plan.md)

## Overview

PayMe uses two mutation mechanisms:

1. **Server Actions** — for authenticated mutations, called directly from client components via React `useTransition`.
2. **Route Handlers** — for guest endpoints (rate-limited, no auth) and query endpoints (search, filter, pagination).

All monetary values are in **integer cents** (e.g., `1000` = $10.00).

---

## Server Actions (Authenticated)

All server actions are defined in `src/lib/actions/`. They require an active authenticated session. Each action validates input, checks authorization, delegates to domain services, and returns a typed result.

### Common Response Envelope

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; field?: string } };
```

---

### createRequest

**File**: `src/lib/actions/request-actions.ts`  
**Auth**: Required (active user)

**Input**:
```typescript
{
  recipientType: 'email' | 'phone';
  recipientValue: string;
  amountCents: number;
  note?: string;
}
```

**Validation**:
- `recipientType` must be `'email'` or `'phone'`.
- `recipientValue` must match valid email format (when email) or E.164 phone format (when phone).
- `amountCents` must be an integer, `>= 1` and `<= 1_000_000`.
- `note` must be `<= 250` characters (if provided).
- `recipientValue` must not match the current user's own email or phone.
- User must have `status = 'active'`.

**Success Response** (`ActionResult<CreateRequestData>`):
```typescript
{
  success: true,
  data: {
    request: {
      id: string;
      requester_id: string;
      recipient_type: 'email' | 'phone';
      recipient_value: string;
      amount_cents: number;
      note: string | null;
      status: 'pending';
      share_token: string;
      created_at: string;
      expires_at: string;
    };
    shareUrl: string;  // e.g., "https://payme.app/pay/{share_token}"
  }
}
```

**Error Codes**:
- `VALIDATION_ERROR` — invalid input (with `field` set)
- `SELF_REQUEST` — recipient matches the sender
- `USER_INACTIVE` — user account is inactive

---

### payRequest

**File**: `src/lib/actions/payment-actions.ts`  
**Auth**: Required (must be the request's recipient)

**Input**:
```typescript
{
  requestId: string;
  fundingSource: 'wallet' | 'bank_account';
}
```

**Validation**:
- `requestId` must reference an existing request.
- Request must be in `pending` status and not expired.
- Current user must be the matched recipient (by email or phone).
- If `fundingSource = 'wallet'`: user's wallet `balance_cents >= request.amount_cents`.
- If `fundingSource = 'bank_account'`: user must have a connected bank account with `balance_cents >= request.amount_cents`.

**Success Response** (`ActionResult<PayRequestData>`):
```typescript
{
  success: true,
  data: {
    transaction: {
      id: string;
      type: 'payment';
      request_id: string;
      payer_id: string;
      recipient_id: string;
      amount_cents: number;
      funding_source_type: 'wallet' | 'bank_account';
      funding_source_id: string;
      status: 'completed';
      created_at: string;
    };
    updatedRequest: {
      id: string;
      status: 'paid';
      resolved_at: string;
    };
  }
}
```

**Error Codes**:
- `REQUEST_NOT_FOUND` — request does not exist
- `REQUEST_NOT_PENDING` — request is not in pending status
- `REQUEST_EXPIRED` — request has passed its expiration time
- `NOT_RECIPIENT` — current user is not the recipient
- `INSUFFICIENT_BALANCE` — funding source lacks sufficient funds
- `NO_BANK_ACCOUNT` — user has no connected bank account
- `ALREADY_PAID` — request was already paid (concurrent request)

---

### declineRequest

**File**: `src/lib/actions/request-actions.ts`  
**Auth**: Required (must be the request's recipient)

**Input**:
```typescript
{
  requestId: string;
}
```

**Validation**:
- Request must exist and be in `pending` status (not expired).
- Current user must be the matched recipient.

**Success Response** (`ActionResult<DeclineRequestData>`):
```typescript
{
  success: true,
  data: {
    request: {
      id: string;
      status: 'declined';
      resolved_at: string;
    };
  }
}
```

**Error Codes**:
- `REQUEST_NOT_FOUND`
- `REQUEST_NOT_PENDING`
- `REQUEST_EXPIRED`
- `NOT_RECIPIENT`

---

### cancelRequest

**File**: `src/lib/actions/request-actions.ts`  
**Auth**: Required (must be the request's requester)

**Input**:
```typescript
{
  requestId: string;
}
```

**Validation**:
- Request must exist and be in `pending` status (not expired).
- Current user must be the requester (`requester_id = auth.uid()`).

**Success Response** (`ActionResult<CancelRequestData>`):
```typescript
{
  success: true,
  data: {
    request: {
      id: string;
      status: 'canceled';
      resolved_at: string;
    };
  }
}
```

**Error Codes**:
- `REQUEST_NOT_FOUND`
- `REQUEST_NOT_PENDING`
- `REQUEST_EXPIRED`
- `NOT_REQUESTER`

---

### connectBankAccount

**File**: `src/lib/actions/bank-actions.ts`  
**Auth**: Required (active user)

**Input**:
```typescript
{
  bankName: string;
  accountNumberLast4: string;
}
```

**Validation**:
- `bankName` must be non-empty.
- `accountNumberLast4` must be exactly 4 digits.
- User must have `status = 'active'`.

**Behavior**:
- If the user already has a connected bank account, the existing one is replaced (soft-deleted or overwritten).
- A new mocked bank account is created with a predefined balance of $10,000.00 (1,000,000 cents).

**Success Response** (`ActionResult<ConnectBankData>`):
```typescript
{
  success: true,
  data: {
    bankAccount: {
      id: string;
      bank_name: string;
      account_number_masked: string;
      balance_cents: number;
      created_at: string;
    };
  }
}
```

**Error Codes**:
- `VALIDATION_ERROR`
- `USER_INACTIVE`

---

### topUpWallet

**File**: `src/lib/actions/wallet-actions.ts`  
**Auth**: Required (active user with connected bank)

**Input**:
```typescript
{
  amountCents: number;
}
```

**Validation**:
- `amountCents` must be an integer, `>= 1`.
- User must have a connected bank account.
- Bank account `balance_cents >= amountCents`.
- User must have `status = 'active'`.

**Success Response** (`ActionResult<TopUpData>`):
```typescript
{
  success: true,
  data: {
    transaction: {
      id: string;
      type: 'top_up';
      recipient_id: string;
      amount_cents: number;
      funding_source_type: 'bank_account';
      funding_source_id: string;
      status: 'completed';
      created_at: string;
    };
    walletBalance: number;
    bankBalance: number;
  }
}
```

**Error Codes**:
- `VALIDATION_ERROR`
- `NO_BANK_ACCOUNT`
- `INSUFFICIENT_BALANCE`
- `USER_INACTIVE`

---

## Route Handlers (Query & Guest)

### GET /api/requests

**File**: `src/app/api/requests/route.ts`  
**Auth**: Required

**Query Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `tab` | `'incoming' \| 'outgoing'` | Yes | Which requests to show |
| `status` | `'pending' \| 'paid' \| 'declined' \| 'canceled' \| 'expired'` | No | Filter by status |
| `search` | `string` | No | Search by counterparty info |
| `page` | `number` | No | Page number (default: 1) |
| `limit` | `number` | No | Items per page (default: 20, max: 50) |

**Success Response** (200):
```typescript
{
  requests: Array<{
    id: string;
    requester_id: string;
    requester_display_name: string;
    recipient_type: 'email' | 'phone';
    recipient_value: string;
    amount_cents: number;
    note: string | null;
    effective_status: 'pending' | 'paid' | 'declined' | 'canceled' | 'expired';
    share_token: string;
    created_at: string;
    expires_at: string;
    resolved_at: string | null;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

**Notes**:
- For `tab = 'incoming'`: returns requests where the user's email or phone matches `recipient_value`.
- For `tab = 'outgoing'`: returns requests where `requester_id = auth.uid()`.
- `effective_status` accounts for lazy expiration (pending + past expiry = expired).
- Results are ordered by `created_at DESC`.

---

### POST /api/pay-guest

**File**: `src/app/api/pay-guest/route.ts`  
**Auth**: None  
**Rate Limit**: 10 requests per IP per minute

**Request Body**:
```typescript
{
  shareToken: string;
  guestBankId: string;  // ID from prior /api/bank-guest call
}
```

**Validation**:
- `shareToken` must reference an existing, pending, non-expired request.
- `guestBankId` must reference a valid guest bank account with sufficient balance.

**Success Response** (200):
```typescript
{
  success: true,
  data: {
    transaction: {
      id: string;
      type: 'payment';
      amount_cents: number;
      status: 'completed';
      created_at: string;
    };
    requestStatus: 'paid';
  }
}
```

**Error Codes**:
- `REQUEST_NOT_FOUND`
- `REQUEST_NOT_PENDING`
- `REQUEST_EXPIRED`
- `INVALID_BANK_ACCOUNT`
- `INSUFFICIENT_BALANCE`
- `RATE_LIMITED` (429 status)

---

### POST /api/bank-guest

**File**: `src/app/api/bank-guest/route.ts`  
**Auth**: None  
**Rate Limit**: 10 requests per IP per minute

**Request Body**:
```typescript
{
  bankName: string;
  accountNumberLast4: string;
}
```

**Validation**:
- `bankName` must be non-empty.
- `accountNumberLast4` must be exactly 4 digits.

**Behavior**:
- Creates a guest bank account record (`user_id = NULL`, `is_guest = true`).
- Assigns a predefined balance of $10,000.00 (1,000,000 cents).
- Returns the bank account ID for use in the subsequent guest payment call.

**Success Response** (200):
```typescript
{
  success: true,
  data: {
    guestBankId: string;
    bankName: string;
    accountNumberMasked: string;
    balanceCents: number;
  }
}
```

**Error Codes**:
- `VALIDATION_ERROR`
- `RATE_LIMITED` (429 status)

---

## Error Response Format

All error responses follow a consistent structure:

```typescript
// Validation errors (400)
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid email format',
    field: 'recipientValue'
  }
}

// Business rule errors (400/409)
{
  success: false,
  error: {
    code: 'INSUFFICIENT_BALANCE',
    message: 'Your wallet balance is insufficient for this payment'
  }
}

// Auth errors (401)
{
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: 'You must be signed in to perform this action'
  }
}

// Rate limit errors (429)
{
  success: false,
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please try again later.'
  }
}

// Not found errors (404)
{
  success: false,
  error: {
    code: 'REQUEST_NOT_FOUND',
    message: 'Payment request not found'
  }
}
```

---

## Status Codes Summary

| Code | Usage |
|------|-------|
| 200 | Successful operation |
| 400 | Validation or business rule error |
| 401 | Not authenticated |
| 403 | Not authorized for this action |
| 404 | Resource not found |
| 409 | Conflict (e.g., already paid) |
| 429 | Rate limited |
| 500 | Unexpected server error |
