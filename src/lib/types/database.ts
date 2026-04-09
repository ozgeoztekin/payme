export interface UserRow {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface WalletRow {
  id: string;
  user_id: string;
  balance_cents: number;
  created_at: string;
  updated_at: string;
}

export interface BankAccountRow {
  id: string;
  user_id: string | null;
  bank_name: string;
  account_number_masked: string;
  balance_cents: number;
  is_guest: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRequestRow {
  id: string;
  requester_id: string;
  recipient_type: 'email' | 'phone';
  recipient_value: string;
  amount_cents: number;
  note: string | null;
  status: 'pending' | 'paid' | 'declined' | 'canceled' | 'expired';
  share_token: string;
  created_at: string;
  expires_at: string;
  resolved_at: string | null;
}

export interface PaymentRequestViewRow extends PaymentRequestRow {
  effective_status: 'pending' | 'paid' | 'declined' | 'canceled' | 'expired';
}

export interface PaymentTransactionRow {
  id: string;
  type: 'payment' | 'top_up';
  request_id: string | null;
  payer_id: string | null;
  recipient_id: string;
  amount_cents: number;
  funding_source_type: 'wallet' | 'bank_account';
  funding_source_id: string;
  status: 'completed' | 'failed';
  created_at: string;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  actor_type: 'user' | 'guest' | 'system';
  action: string;
  target_type: string;
  target_id: string;
  metadata: Record<string, unknown>;
  outcome: 'success' | 'failure';
  created_at: string;
}
