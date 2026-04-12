import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/services/profile-service';
import { AppSidebar, MobileHeader, MobileBottomNav } from '@/components/layout/app-sidebar';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profileResult = await getProfile(user.id);
  const fallback = user.email?.split('@')[0] ?? 'User';
  const displayName = (profileResult.success && profileResult.data.display_name) || fallback;

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar displayName={displayName} />
      <MobileHeader />
      <main className="flex-1 p-4 pb-20 md:p-10 md:pb-10">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
