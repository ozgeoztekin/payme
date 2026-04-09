import { supabaseAdmin } from '@/lib/db/client';
import type { User } from '@supabase/supabase-js';

/**
 * Ensures a public.users row and wallet exist for the given auth user.
 * This is a safety net for users who signed up before the DB trigger
 * was added or if the trigger fails for any reason.
 */
export async function ensureProfile(user: User) {
  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (existing) return;

  const displayName =
    user.user_metadata?.display_name ??
    (user.email ? user.email.split('@')[0] : 'User');

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
      balance_cents: 0,
    },
    { onConflict: 'user_id' },
  );
}
