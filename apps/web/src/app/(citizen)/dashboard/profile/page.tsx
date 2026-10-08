'use client';

import { ProfileForm, ProfileOverview } from '@/components/account/account-settings';
import { PageHeader } from '@/components/common/page';

export default function ProfilePage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Profile' }]}
        title="Profile"
        description="Keep your contact details current so crews can reach you if they need to."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <ProfileOverview />
        <ProfileForm />
      </div>
    </>
  );
}
