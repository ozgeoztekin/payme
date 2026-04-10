import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getBankAccount } from '@/lib/services/bank-service';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bankAccount = await getBankAccount(user.id);

  return NextResponse.json({ bankAccount });
}
