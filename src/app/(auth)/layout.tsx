import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppSidebar, MobileHeader, MobileBottomNav } from '@/components/layout/app-sidebar';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppSidebar user={user} />
      <MobileHeader />
      <main className="flex-1 p-4 pb-20 md:p-10 md:pb-10">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
