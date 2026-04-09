import { createClient } from '@supabase/supabase-js';

const TEST_EMAIL = 'alice@test.com';
const TEST_PASSWORD = 'testpassword123';

export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const exists = existingUsers?.users?.some((u) => u.email === TEST_EMAIL);

  if (!exists) {
    const { error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }
    console.log(`Created test user: ${TEST_EMAIL}`);
  }
}
