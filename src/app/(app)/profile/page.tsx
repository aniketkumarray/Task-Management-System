import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/dates";
import { Avatar, PageHeader } from "@/components/ui";
import { NameForm, PasswordForm } from "./profile-forms";
import { ThemeSelect } from "@/components/theme";

export default async function ProfilePage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My Profile" subtitle="Your details and sign-in password." />

      <div className="space-y-4">
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={profile.full_name} size="lg" />
            <div>
              <p className="font-medium text-gray-900">{profile.full_name}</p>
              <p className="text-sm text-gray-500">
                {profile.email} · <span className="capitalize">{profile.role}</span> · joined {formatDate(profile.created_at.slice(0, 10))}
              </p>
            </div>
          </div>
          <NameForm fullName={profile.full_name} />
        </div>

        <div className="card p-5">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Appearance</h2>
          <p className="mb-3 text-xs text-gray-500">
            Saved on this device. &ldquo;System&rdquo; follows your phone or computer setting.
          </p>
          <ThemeSelect />
        </div>

        <div className="card p-5">
          <h2 className="mb-1 text-sm font-semibold text-gray-900">Change password</h2>
          <p className="mb-4 text-xs text-gray-500">You&apos;ll stay signed in on this device after changing it.</p>
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
