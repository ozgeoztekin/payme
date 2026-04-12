import { supabaseAdmin } from '@/lib/db/client';
import { createAuditLog } from '@/lib/services/audit-service';
import { AuditAction, ActorType } from '@/lib/types/domain';
import type { ActionResult } from '@/lib/types/api';
import type { User } from '@supabase/supabase-js';

export interface UserRow {
  id: string;
  email: string | null;
  phone: string | null;
  status: string;
  display_name: string;
}

export async function getProfile(userId: string): Promise<ActionResult<UserRow>> {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, email, phone, status, display_name')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Profile not found.' },
    };
  }

  return { success: true, data: data as UserRow };
}

export async function addPhoneNumber(
  userId: string,
  phone: string,
): Promise<ActionResult<{ phone: string }>> {
  const profileResult = await getProfile(userId);
  if (!profileResult.success) {
    return profileResult;
  }

  const profile = profileResult.data;

  if (profile.status !== 'active') {
    return {
      success: false,
      error: {
        code: 'INACTIVE_ACCOUNT',
        message: 'Adding a phone number is unavailable while your account is inactive.',
      },
    };
  }

  if (profile.phone !== null) {
    return {
      success: false,
      error: {
        code: 'PHONE_ALREADY_SET',
        message: 'A phone number is already associated with your account.',
      },
    };
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .update({ phone, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .is('phone', null)
    .eq('status', 'active')
    .select('phone')
    .single();

  if (error) {
    if (error.message?.includes('unique') || error.code === '23505') {
      return {
        success: false,
        error: {
          code: 'PHONE_UNAVAILABLE',
          message: 'This phone number is already in use by another account.',
        },
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred. Please try again.',
        },
      };
    }
  }

  if (!data) {
    return {
      success: false,
      error: {
        code: 'PHONE_ALREADY_SET',
        message: 'A phone number is already associated with your account.',
      },
    };
  }

  await createAuditLog({
    actorId: userId,
    actorType: ActorType.USER,
    action: AuditAction.PHONE_ADDED,
    targetType: 'user',
    targetId: userId,
    metadata: { phone },
    outcome: 'success',
  });

  return { success: true, data: { phone: data.phone } };
}

/**
 * Ensures a public.users row and wallet exist for the given auth user.
 * Safety net for users created before the DB trigger or if it fails.
 */
export async function ensureProfile(user: User) {
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (existing) return;

  const displayName =
    user.user_metadata?.display_name ?? (user.email ? user.email.split('@')[0] : 'User');

  await supabaseAdmin.from('users').upsert(
    {
      id: user.id,
      display_name: displayName,
      email: user.email ?? null,
      phone: user.phone ?? null,
      status: 'active',
    },
    { onConflict: 'id' },
  );

  await supabaseAdmin.from('wallets').upsert(
    {
      user_id: user.id,
      balance_minor: 0,
    },
    { onConflict: 'user_id' },
  );
}
