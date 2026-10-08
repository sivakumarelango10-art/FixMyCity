import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { homePathForRole } from '@fixmycity/shared';
import { Workspace } from '@/components/layout/workspace';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = { title: { default: 'Citizen portal', template: '%s | FixMyCity' } };

export default async function CitizenLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?expired=1&next=/dashboard');
  if (user.role !== 'CITIZEN') redirect(homePathForRole(user.role));
  return <Workspace user={user}>{children}</Workspace>;
}
