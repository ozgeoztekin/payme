import { supabaseAdmin } from '@/lib/db/client';
import type { ActionResult } from '@/lib/types/api';
import type { FundingSourceType } from '@/lib/types/domain';

interface ProcessPaymentParams {
  requestId: string;
  payerId: string;
  fundingSourceType: FundingSourceType;
  fundingSourceId: string;
  isGuest?: boolean;
}

interface ProcessPaymentResult {
  transactionId: string;
}

const ERROR_MAP: Record<string, { code: string; message: string }> = {
  'insufficient wallet balance': {
    code: 'INSUFFICIENT_BALANCE',
    message: 'Your wallet balance is insufficient for this payment',
  },
  'insufficient bank balance': {
    code: 'INSUFFICIENT_BALANCE',
    message: 'Your bank account balance is insufficient for this payment',
  },
  'payment request is not pending': {
    code: 'REQUEST_NOT_PENDING',
    message: 'This request is no longer pending',
  },
  'payment request has expired': {
    code: 'REQUEST_EXPIRED',
    message: 'This request has expired',
  },
  'payment request not found': {
    code: 'REQUEST_NOT_FOUND',
    message: 'Payment request not found',
  },
  'payer wallet not found': {
    code: 'PAYMENT_FAILED',
    message: 'Wallet not found',
  },
  'bank account not found': {
    code: 'NO_BANK_ACCOUNT',
    message: 'Bank account not found',
  },
  'guest bank account not found': {
    code: 'INVALID_BANK_ACCOUNT',
    message: 'Guest bank account not found',
  },
  'requester wallet not found': {
    code: 'PAYMENT_FAILED',
    message: 'Requester wallet not found',
  },
  'guest cannot pay from wallet': {
    code: 'PAYMENT_FAILED',
    message: 'Guest payments must use a bank account',
  },
};

function mapRpcError(message: string): { code: string; message: string } {
  for (const [key, mapped] of Object.entries(ERROR_MAP)) {
    if (message.includes(key)) return mapped;
  }
  return { code: 'PAYMENT_FAILED', message: message || 'Payment processing failed' };
}

export async function processPayment(
  params: ProcessPaymentParams,
): Promise<ActionResult<ProcessPaymentResult>> {
  const { data, error } = await supabaseAdmin.rpc('process_payment', {
    p_request_id: params.requestId,
    p_payer_id: params.payerId,
    p_funding_source_type: params.fundingSourceType,
    p_funding_source_id: params.fundingSourceId,
    p_is_guest: params.isGuest ?? false,
  });

  if (error) {
    const mapped = mapRpcError(error.message);
    return { success: false, error: mapped };
  }

  return {
    success: true,
    data: { transactionId: data as string },
  };
}
