import { supabaseAdmin } from './client';

export async function processPaymentTransaction(params: {
  requestId: string;
  payerId: string | null;
  fundingSourceType: 'wallet' | 'bank_account';
  fundingSourceId: string;
  isGuest?: boolean;
}) {
  const { data, error } = await supabaseAdmin.rpc('process_payment', {
    p_request_id: params.requestId,
    p_payer_id: params.payerId,
    p_funding_source_type: params.fundingSourceType,
    p_funding_source_id: params.fundingSourceId,
    p_is_guest: params.isGuest ?? false,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

export async function processTopUpTransaction(params: {
  userId: string;
  bankAccountId: string;
  amountCents: number;
}) {
  const { data, error } = await supabaseAdmin.rpc('process_top_up', {
    p_user_id: params.userId,
    p_bank_account_id: params.bankAccountId,
    p_amount_cents: params.amountCents,
  });

  if (error) throw new Error(error.message);
  return data as string;
}
