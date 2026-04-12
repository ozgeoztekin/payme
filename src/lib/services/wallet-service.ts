import { supabaseAdmin } from '@/lib/db/client';
import type { ActionResult } from '@/lib/types/api';
import type { WalletRow } from '@/lib/types/database';

interface TopUpParams {
  userId: string;
  bankAccountId: string;
  amountMinor: number;
}

interface TopUpResult {
  transactionId: string;
}

const ERROR_MAP: Record<string, { code: string; message: string }> = {
  'insufficient bank balance': {
    code: 'INSUFFICIENT_BALANCE',
    message: 'Your bank account balance is insufficient for this top-up',
  },
  'bank account not found': {
    code: 'NO_BANK_ACCOUNT',
    message: 'Bank account not found',
  },
  'invalid amount_minor': {
    code: 'VALIDATION_ERROR',
    message: 'Amount must be greater than zero',
  },
};

function mapRpcError(message: string): { code: string; message: string } {
  for (const [key, mapped] of Object.entries(ERROR_MAP)) {
    if (message.includes(key)) return mapped;
  }
  return { code: 'TOP_UP_FAILED', message: message || 'Top-up processing failed' };
}

export async function topUpFromBank(params: TopUpParams): Promise<ActionResult<TopUpResult>> {
  const { data, error } = await supabaseAdmin.rpc('process_top_up', {
    p_user_id: params.userId,
    p_bank_account_id: params.bankAccountId,
    p_amount_minor: params.amountMinor,
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

export async function getWalletBalance(userId: string): Promise<WalletRow | null> {
  const { data } = await supabaseAdmin.from('wallets').select('*').eq('user_id', userId).single();

  return data;
}
