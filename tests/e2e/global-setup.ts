import { createClient } from '@supabase/supabase-js';

const ALICE_EMAIL = 'alice@test.com';
const BOB_EMAIL = 'bob@test.com';
const TEST_PASSWORD = 'testpassword123';

const ALICE_ID = '11111111-1111-1111-1111-111111111111';
const BOB_ID = '22222222-2222-2222-2222-222222222222';

const TEST_USERS = [
  { email: ALICE_EMAIL, id: ALICE_ID },
  { email: BOB_EMAIL, id: BOB_ID },
];

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

  for (const testUser of TEST_USERS) {
    const exists = existingUsers?.users?.some((u) => u.email === testUser.email);
    if (!exists) {
      const { error } = await supabase.auth.admin.createUser({
        email: testUser.email,
        password: TEST_PASSWORD,
        email_confirm: true,
      });
      if (error) {
        throw new Error(`Failed to create test user ${testUser.email}: ${error.message}`);
      }
      console.log(`Created test user: ${testUser.email}`);
    }
  }

  await resetSeedData(supabase);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resetSeedData(supabase: any) {
  await supabase.from('wallets').upsert(
    [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        user_id: ALICE_ID,
        balance_minor: 10000,
        currency: 'USD',
      },
      {
        id: 'c2222222-2222-2222-2222-222222222222',
        user_id: BOB_ID,
        balance_minor: 5000,
        currency: 'USD',
      },
    ],
    { onConflict: 'user_id' },
  );

  await supabase.from('bank_accounts').delete().in('user_id', [ALICE_ID, BOB_ID]);

  await supabase.from('bank_accounts').upsert([
    {
      id: 'd1111111-1111-1111-1111-111111111111',
      user_id: ALICE_ID,
      bank_name: 'Test Bank',
      account_number_masked: '••••1001',
      balance_minor: 1000000,
      currency: 'USD',
      is_guest: false,
    },
    {
      id: 'd2222222-2222-2222-2222-222222222222',
      user_id: BOB_ID,
      bank_name: 'Test Bank',
      account_number_masked: '••••2002',
      balance_minor: 1000000,
      currency: 'USD',
      is_guest: false,
    },
  ]);
}
