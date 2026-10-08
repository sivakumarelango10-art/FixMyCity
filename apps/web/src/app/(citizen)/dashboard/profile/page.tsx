'use client';

import { ProfileForm } from '@/components/account/account-settings';
import { PageHeader } from '@/components/common/page';

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" description="Keep your contact details current so crews can reach you if needed." />
      <ProfileForm />
    </>
  );
}
