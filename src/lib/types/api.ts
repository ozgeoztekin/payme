export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; field?: string } };

export interface CreateRequestInput {
  recipientType: 'email' | 'phone';
  recipientValue: string;
  amountCents: number;
  note?: string;
}

export interface PayRequestInput {
  requestId: string;
  fundingSource: 'wallet' | 'bank_account';
}

export interface DeclineRequestInput {
  requestId: string;
}

export interface CancelRequestInput {
  requestId: string;
}

export interface ConnectBankInput {
  bankName: string;
  accountNumberLast4: string;
}

export interface TopUpWalletInput {
  amountCents: number;
}

export interface GuestPaymentInput {
  shareToken: string;
  guestBankId: string;
}

export interface GuestBankInput {
  bankName: string;
  accountNumberLast4: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
