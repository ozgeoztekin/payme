import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/services/profile-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete('code');
  redirectTo.searchParams.delete('next');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ensureProfile(user);
      }
      return NextResponse.redirect(redirectTo);
    }
  }

  redirectTo.pathname = '/login';
  redirectTo.searchParams.set('error', 'Could not verify email. Please try again.');
  return NextResponse.redirect(redirectTo);
}
