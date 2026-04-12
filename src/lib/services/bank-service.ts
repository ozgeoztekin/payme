import { supabaseAdmin } from '@/lib/db/client';
import { createAuditLog } from '@/lib/services/audit-service';
import { MOCKED_BANK_BALANCE_MINOR } from '@/lib/constants';
import { ActorType, AuditAction } from '@/lib/types/domain';
import type { ActionResult } from '@/lib/types/api';
import type { BankAccountRow } from '@/lib/types/database';

export async function getBankAccount(userId: string): Promise<BankAccountRow | null> {
  const { data } = await supabaseAdmin
    .from('bank_accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_guest', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export async function connectBankAccount(params: {
  userId: string;
  bankName: string;
  accountNumberLast4: string;
}): Promise<ActionResult<{ bankAccount: BankAccountRow }>> {
  const { userId, bankName, accountNumberLast4 } = params;
  const maskedNumber = `••••${accountNumberLast4}`;

  const existing = await getBankAccount(userId);

  if (existing) {
    const { error: deleteError } = await supabaseAdmin
      .from('bank_accounts')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      return {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to replace existing bank account' },
      };
    }

    await createAuditLog({
      actorId: userId,
      actorType: ActorType.USER,
      action: AuditAction.BANK_REPLACED,
      targetType: 'bank_account',
      targetId: existing.id,
      metadata: {
        old_bank_name: existing.bank_name,
        new_bank_name: bankName,
      },
      outcome: 'success',
    });
  }

  const { data: bankAccount, error: insertError } = await supabaseAdmin
    .from('bank_accounts')
    .insert({
      user_id: userId,
      bank_name: bankName,
      account_number_masked: maskedNumber,
      balance_minor: MOCKED_BANK_BALANCE_MINOR,
      is_guest: false,
    })
    .select()
    .single();

  if (insertError || !bankAccount) {
    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to connect bank account' },
    };
  }

  await createAuditLog({
    actorId: userId,
    actorType: ActorType.USER,
    action: AuditAction.BANK_CONNECTED,
    targetType: 'bank_account',
    targetId: bankAccount.id,
    metadata: {
      bank_name: bankName,
      balance_minor: MOCKED_BANK_BALANCE_MINOR,
    },
    outcome: 'success',
  });

  return { success: true, data: { bankAccount } };
}
