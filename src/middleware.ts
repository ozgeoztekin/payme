import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = ['/', '/pay', '/auth', '/api/bank-guest', '/api/decline-guest', '/api/pay-guest'];
const AUTH_ROUTES = ['/login', '/signup'];

const PAY_TOKEN_RE = /^\/pay\/([0-9a-f-]{36})$/;

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (user && isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (user) {
    const tokenMatch = pathname.match(PAY_TOKEN_RE);
    if (tokenMatch) {
      const shareToken = tokenMatch[1];
      const redirectUrl = await resolveRecipientRedirect(user.id, shareToken);
      if (redirectUrl) {
        const url = request.nextUrl.clone();
        url.pathname = redirectUrl;
        return NextResponse.redirect(url);
      }
    }
  }

  if (!user && !isPublicRoute(pathname) && !isAuthRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

async function resolveRecipientRedirect(
  userId: string,
  shareToken: string,
): Promise<string | null> {
  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: paymentRequest } = await admin
      .from('payment_requests')
      .select('id, recipient_type, recipient_value')
      .eq('share_token', shareToken)
      .single();

    if (!paymentRequest) return null;

    const { data: profile } = await admin
      .from('users')
      .select('email, phone')
      .eq('id', userId)
      .single();

    if (!profile) return null;

    const isRecipientByEmail =
      paymentRequest.recipient_type === 'email' &&
      profile.email &&
      profile.email.toLowerCase() === paymentRequest.recipient_value.toLowerCase();

    const isRecipientByPhone =
      paymentRequest.recipient_type === 'phone' &&
      profile.phone &&
      profile.phone === paymentRequest.recipient_value;

    if (isRecipientByEmail || isRecipientByPhone) {
      return `/requests/${paymentRequest.id}`;
    }

    return null;
  } catch {
    return null;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
