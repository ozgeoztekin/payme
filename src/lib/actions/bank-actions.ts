'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/db/client';
import { connectBankAccount as connectBankService } from '@/lib/services/bank-service';
import type { ActionResult } from '@/lib/types/api';
import type { BankAccountRow } from '@/lib/types/database';

const connectBankSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required').max(100, 'Bank name too long'),
  accountNumberLast4: z
    .string()
    .regex(/^\d{4}$/, 'Must be exactly 4 digits'),
});

export async function connectBankAccount(input: {
  bankName: string;
  accountNumberLast4: string;
}): Promise<ActionResult<{ bankAccount: BankAccountRow }>> {
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

  const parsed = connectBankSchema.safeParse(input);
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

  return connectBankService({
    userId: user.id,
    bankName: parsed.data.bankName,
    accountNumberLast4: parsed.data.accountNumberLast4,
  });
}

export async function disconnectBankAccount(): Promise<ActionResult<{ disconnected: boolean }>> {
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

  const { error } = await supabaseAdmin
    .from('bank_accounts')
    .delete()
    .eq('user_id', user.id)
    .eq('is_guest', false);

  if (error) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to disconnect bank account' },
    };
  }

  return { success: true, data: { disconnected: true } };
}
