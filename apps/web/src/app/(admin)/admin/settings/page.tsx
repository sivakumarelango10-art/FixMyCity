'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Warning } from '@phosphor-icons/react';
import type { SystemStatus } from '@fixmycity/shared';
import { ProfileForm, SettingsPanels } from '@/components/account/account-settings';
import { PageHeader } from '@/components/common/page';
import { Panel, PanelHeader, Skeleton } from '@/components/ui/primitives';
import { api } from '@/lib/api';
import { qk } from '@/lib/query-keys';

function Row({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <span className="flex items-center gap-2.5 text-[13.5px] font-semibold text-fg">
        {ok ? <CheckCircle size={18} weight="fill" className="text-success" /> : <Warning size={18} weight="fill" className="text-warning" />}
        {label}
      </span>
      <span className="text-right text-[13px] text-fg-muted">{value}</span>
    </li>
  );
}

export default function AdminSettingsPage() {
  const q = useQuery({ queryKey: qk.adminSystem, queryFn: () => api.get<SystemStatus>('/api/admin/system'), refetchInterval: 30_000 });
  const s = q.data;
  return (
    <div className="grid gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Overview', href: '/admin' }, { label: 'Settings' }]}
        title="Settings"
        description="System configuration is read from server environment variables. Nothing here changes infrastructure."
        className="mb-0"
      />
      <Panel>
        <PanelHeader title="System status" description="Live from the API." />
        <div className="px-5 pb-3 sm:px-6">
          {q.isLoading || !s ? (
            <Skeleton className="my-4 h-40" />
          ) : (
            <ul className="divide-y divide-line">
              <Row ok={s.database.ok} label="Database" value={s.database.ok ? 'Connected' : 'Unreachable'} />
              <Row
                ok
                label="Complaint classification"
                value={s.ai.configured ? `AI provider (${s.ai.provider}, ${s.ai.model}) with rule-based fallback` : 'Local rule-based classifier (no AI provider configured)'}
              />
              <Row ok={s.storage.durable} label="Photo storage" value={s.storage.driver === 's3' ? 'S3-compatible object storage' : 'Local disk (development only, not durable on most hosts)'} />
              <Row ok={s.email.configured} label="Email delivery" value={s.email.configured ? 'SMTP configured' : 'Not configured: reset links are printed in the API log in development'} />
              <Row ok label="Realtime" value={`${s.realtime.connectedClients} connected client${s.realtime.connectedClients === 1 ? '' : 's'}`} />
              <Row ok label="Reopen window" value={`${s.reopenWindowDays} days after resolution`} />
              <Row ok label="Environment" value={s.environment} />
            </ul>
          )}
        </div>
      </Panel>
      <ProfileForm />
      <SettingsPanels />
    </div>
  );
}
