import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { homePathForRole } from '@fixmycity/shared';
import { Workspace } from '@/components/layout/workspace';
import { getSessionUser } from '@/lib/session';

export const metadata: Metadata = { title: { default: 'Department workspace', template: '%s | FixMyCity' } };

export default async function DepartmentLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login?expired=1&next=/department');
  if (user.role !== 'DEPARTMENT_OFFICER') redirect(homePathForRole(user.role));
  return <Workspace user={user}>{children}</Workspace>;
}
