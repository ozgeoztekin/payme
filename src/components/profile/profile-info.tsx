import type { UserRow } from '@/lib/services/profile-service';

export function ProfileInfo({ profile }: { profile: UserRow }) {
  return (
    <section className="rounded-xl border border-slate-100 bg-white p-6 space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">Account Information</h2>

      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Name</p>
        <p className="text-sm text-slate-900">{profile.display_name}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</p>
        <p className="text-sm text-slate-900">{profile.email}</p>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
          Phone Number
        </p>
        {profile.phone ? (
          <p className="text-sm text-slate-900">{profile.phone}</p>
        ) : (
          <p className="text-sm text-slate-400 italic">No phone number added</p>
        )}
      </div>

      {profile.status === 'inactive' && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800">
            Your account is currently inactive. Some actions, including adding a phone number, are
            unavailable.
          </p>
        </div>
      )}
    </section>
  );
}
