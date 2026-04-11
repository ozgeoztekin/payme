import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/services/profile-service';
import { ProfileInfo } from '@/components/profile/profile-info';

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const profileResult = await getProfile(user.id);

  if (!profileResult.success) {
    return (
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Profile</h1>
        <div className="rounded-xl border border-red-100 bg-red-50 p-6">
          <p className="text-sm text-red-700">Unable to load profile. Please try again later.</p>
        </div>
      </div>
    );
  }

  const profile = profileResult.data;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
      <ProfileInfo profile={profile} />
    </div>
  );
}
