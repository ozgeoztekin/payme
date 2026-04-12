export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; field?: string } };

export interface CreateRequestInput {
  recipientType: 'email' | 'phone';
  recipientValue: string;
  amountMinor: number;
  currency: string;
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
  amountMinor: number;
}

export interface GuestPaymentInput {
  shareToken: string;
  guestBankId: string;
}

export interface AddPhoneInput {
  phone: string;
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

export type RequestListTab = 'incoming' | 'outgoing';

export type RequestListEffectiveStatus = 'pending' | 'paid' | 'declined' | 'canceled' | 'expired';

export interface PaymentRequestListItem {
  id: string;
  requester_id: string;
  requester_display_name: string;
  recipient_type: 'email' | 'phone';
  recipient_value: string;
  amount_minor: number;
  currency: string;
  note: string | null;
  effective_status: RequestListEffectiveStatus;
  share_token: string;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
}

export interface PaymentRequestListResponse {
  requests: PaymentRequestListItem[];
  total: number;
  page: number;
  limit: number;
  pending_action_count?: number;
}
