'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/db/client';
import { validatePayRequest } from '@/lib/validators/payment-validators';
import { processPayment } from '@/lib/services/payment-service';
import { createAuditLog } from '@/lib/services/audit-service';
import { AuditAction, ActorType } from '@/lib/types/domain';
import type { ActionResult, PayRequestInput } from '@/lib/types/api';

interface PayRequestData {
  transactionId: string;
  requestId: string;
}

export async function payRequest(input: PayRequestInput): Promise<ActionResult<PayRequestData>> {
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

  const validation = validatePayRequest(input);
  if (!validation.success) {
    return validation;
  }

  const { requestId, fundingSource } = validation.data;

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id, email, phone, status')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
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

  const { data: request, error: reqError } = await supabaseAdmin
    .from('payment_requests_view')
    .select('*')
    .eq('id', requestId)
    .single();

  if (reqError || !request) {
    return {
      success: false,
      error: { code: 'REQUEST_NOT_FOUND', message: 'Payment request not found' },
    };
  }

  if (request.effective_status !== 'pending') {
    const code = request.effective_status === 'expired' ? 'REQUEST_EXPIRED' : 'REQUEST_NOT_PENDING';
    const message =
      request.effective_status === 'expired'
        ? 'This request has expired'
        : 'This request is no longer pending';
    return { success: false, error: { code, message } };
  }

  const isRecipientByEmail =
    request.recipient_type === 'email' &&
    profile.email &&
    profile.email.toLowerCase() === request.recipient_value.toLowerCase();

  const isRecipientByPhone =
    request.recipient_type === 'phone' &&
    profile.phone &&
    profile.phone === request.recipient_value;

  if (!isRecipientByEmail && !isRecipientByPhone) {
    return {
      success: false,
      error: { code: 'NOT_RECIPIENT', message: 'You are not the recipient of this request' },
    };
  }

  let fundingSourceId: string;

  if (fundingSource === 'wallet') {
    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('wallets')
      .select('id, balance_minor')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      return {
        success: false,
        error: { code: 'PAYMENT_FAILED', message: 'Wallet not found' },
      };
    }

    if (wallet.balance_minor < request.amount_minor) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Your wallet balance is insufficient for this payment',
        },
      };
    }

    fundingSourceId = wallet.id;
  } else {
    const { data: bank, error: bankError } = await supabaseAdmin
      .from('bank_accounts')
      .select('id, balance_minor')
      .eq('user_id', user.id)
      .eq('is_guest', false)
      .single();

    if (bankError || !bank) {
      return {
        success: false,
        error: { code: 'NO_BANK_ACCOUNT', message: 'No connected bank account found' },
      };
    }

    if (bank.balance_minor < request.amount_minor) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Your bank account balance is insufficient for this payment',
        },
      };
    }

    fundingSourceId = bank.id;
  }

  const result = await processPayment({
    requestId,
    payerId: user.id,
    fundingSourceType: fundingSource,
    fundingSourceId,
  });

  if (!result.success) {
    await createAuditLog({
      actorId: user.id,
      actorType: ActorType.USER,
      action: AuditAction.PAYMENT_FAILED,
      targetType: 'payment_request',
      targetId: requestId,
      metadata: {
        funding_source_type: fundingSource,
        error_code: result.error.code,
        error_message: result.error.message,
      },
      outcome: 'failure',
    });
    return result;
  }

  return {
    success: true,
    data: {
      transactionId: result.data.transactionId,
      requestId,
    },
  };
}
