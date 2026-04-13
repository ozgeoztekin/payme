import { createClient } from '@supabase/supabase-js';

const ALICE_EMAIL = 'alice@test.com';
const BOB_EMAIL = 'bob@test.com';
const TEST_PASSWORD = 'testpassword123';

const TEST_USER_EMAILS = [ALICE_EMAIL, BOB_EMAIL] as const;

/** Stable primary keys for seeded bank rows (tests may restore these ids). */
const ALICE_BANK_ID = 'd1111111-1111-1111-1111-111111111111';
const BOB_BANK_ID = 'd2222222-2222-2222-2222-222222222222';

export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingUsers } = await supabase.auth.admin.listUsers();

  for (const email of TEST_USER_EMAILS) {
    const exists = existingUsers?.users?.some((u) => u.email === email);
    if (!exists) {
      const { error } = await supabase.auth.admin.createUser({
        email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      if (error) {
        throw new Error(`Failed to create test user ${email}: ${error.message}`);
      }
      console.log(`Created test user: ${email}`);
    }
  }

  const aliceId = await getAuthUserIdByEmail(supabase, ALICE_EMAIL);
  const bobId = await getAuthUserIdByEmail(supabase, BOB_EMAIL);

  await resetSeedData(supabase, aliceId, bobId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getAuthUserIdByEmail(supabase: any, email: string): Promise<string> {
  const perPage = 200;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`listUsers failed: ${error.message}`);
    }
    const user = data.users.find(
      (u: { email?: string | null }) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (user) {
      return user.id;
    }
    if (data.users.length < perPage) {
      break;
    }
  }
  throw new Error(`Auth user not found for email: ${email}`);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resetSeedData(supabase: any, aliceId: string, bobId: string) {
  await supabase.from('users').upsert(
    [
      {
        id: aliceId,
        display_name: 'Alice',
        email: ALICE_EMAIL,
        phone: '+15551234567',
        status: 'active',
      },
      {
        id: bobId,
        display_name: 'Bob',
        email: BOB_EMAIL,
        phone: '+15559876543',
        status: 'active',
      },
    ],
    { onConflict: 'id' },
  );

  await supabase.from('wallets').upsert(
    [
      { user_id: aliceId, balance_minor: 10000, currency: 'USD' },
      { user_id: bobId, balance_minor: 5000, currency: 'USD' },
    ],
    { onConflict: 'user_id' },
  );

  await supabase.from('bank_accounts').delete().in('user_id', [aliceId, bobId]);

  const { error: bankError } = await supabase.from('bank_accounts').upsert([
    {
      id: ALICE_BANK_ID,
      user_id: aliceId,
      bank_name: 'Test Bank',
      account_number_masked: '••••1001',
      balance_minor: 1000000,
      currency: 'USD',
      is_guest: false,
    },
    {
      id: BOB_BANK_ID,
      user_id: bobId,
      bank_name: 'Test Bank',
      account_number_masked: '••••2002',
      balance_minor: 1000000,
      currency: 'USD',
      is_guest: false,
    },
  ]);

  if (bankError) {
    throw new Error(`bank_accounts seed failed: ${bankError.message}`);
  }
}
