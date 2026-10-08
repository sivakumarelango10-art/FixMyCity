'use client';

import { SettingsPanels } from '@/components/account/account-settings';
import { PageHeader } from '@/components/common/page';

export default function CitizenSettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Appearance, password and signed-in devices." />
      <SettingsPanels />
    </>
  );
}
