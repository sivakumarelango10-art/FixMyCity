'use client';

import { ProfileForm, SettingsPanels } from '@/components/account/account-settings';
import { PageHeader } from '@/components/common/page';

export default function OfficerSettingsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Settings" description="Your profile, appearance, password and signed-in devices." className="mb-0" />
      <ProfileForm />
      <SettingsPanels />
    </div>
  );
}
