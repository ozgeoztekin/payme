import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/services/profile-service';
import { ProfileInfo } from '@/components/profile/profile-info';
import { AddPhoneForm } from '@/components/profile/add-phone-form';
import { LogoutButton } from '@/components/profile/logout-button';
import { SuccessBanner } from '@/components/profile/success-banner';
import { PageContainer, PageHeader } from '@/components/layout/page-layout';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const phoneAdded = params.phone_added === 'true';

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
      <PageContainer size="sm">
        <PageHeader title="Profile" />
        <div className="rounded-xl border border-red-100 bg-red-50 p-6">
          <p className="text-sm text-red-700">Unable to load profile. Please try again later.</p>
        </div>
      </PageContainer>
    );
  }

  const profile = profileResult.data;

  const showAddPhone = profile.status === 'active' && profile.phone === null;

  return (
    <PageContainer size="sm">
      <PageHeader title="Profile" actions={<LogoutButton />} />
      {phoneAdded && <SuccessBanner message="Phone number added successfully." />}
      <ProfileInfo profile={profile} />
      {showAddPhone && <AddPhoneForm />}
    </PageContainer>
  );
}
