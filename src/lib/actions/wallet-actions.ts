'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/db/client';
import { topUpFromBank } from '@/lib/services/wallet-service';
import { createAuditLog } from '@/lib/services/audit-service';
import { AuditAction, ActorType } from '@/lib/types/domain';
import { AMOUNT_MIN_CENTS } from '@/lib/constants';
import type { ActionResult } from '@/lib/types/api';

const topUpSchema = z.object({
  amountCents: z
    .number()
    .int('Amount must be a whole number')
    .min(AMOUNT_MIN_CENTS, 'Amount must be at least $0.01'),
});

interface TopUpData {
  transactionId: string;
  walletBalance: number;
  bankBalance: number;
}

export async function topUpWallet(input: {
  amountCents: number;
}): Promise<ActionResult<TopUpData>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in' },
    };
  }

  const parsed = topUpSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: firstIssue.message,
        field: firstIssue.path[0]?.toString(),
      },
    };
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return {
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User profile not found' },
    };
  }

  if (profile.status !== 'active') {
    return {
      success: false,
      error: {
        code: 'USER_INACTIVE',
        message: 'Your account is not active. Please contact support.',
      },
    };
  }

  const { data: bank } = await supabaseAdmin
    .from('bank_accounts')
    .select('id, balance_cents')
    .eq('user_id', user.id)
    .eq('is_guest', false)
    .single();

  if (!bank) {
    return {
      success: false,
      error: {
        code: 'NO_BANK_ACCOUNT',
        message: 'You need to connect a bank account first',
      },
    };
  }

  if (bank.balance_cents < parsed.data.amountCents) {
    return {
      success: false,
      error: {
        code: 'INSUFFICIENT_BALANCE',
        message: 'Your bank account balance is insufficient for this top-up',
      },
    };
  }

  const result = await topUpFromBank({
    userId: user.id,
    bankAccountId: bank.id,
    amountCents: parsed.data.amountCents,
  });

  if (!result.success) {
    await createAuditLog({
      actorId: user.id,
      actorType: ActorType.USER,
      action: AuditAction.WALLET_TOP_UP,
      targetType: 'wallet',
      targetId: user.id,
      metadata: {
        amount_cents: parsed.data.amountCents,
        bank_account_id: bank.id,
        error_code: result.error.code,
        error_message: result.error.message,
      },
      outcome: 'failure',
    });
    return result;
  }

  const { data: updatedWallet } = await supabaseAdmin
    .from('wallets')
    .select('balance_cents')
    .eq('user_id', user.id)
    .single();

  const { data: updatedBank } = await supabaseAdmin
    .from('bank_accounts')
    .select('balance_cents')
    .eq('id', bank.id)
    .single();

  return {
    success: true,
    data: {
      transactionId: result.data.transactionId,
      walletBalance: updatedWallet?.balance_cents ?? 0,
      bankBalance: updatedBank?.balance_cents ?? 0,
    },
  };
}
