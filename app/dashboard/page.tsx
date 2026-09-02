import { AppNav } from '@/components/shared/app-nav';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireRole(['superadmin', 'rsm']);
  return (
    <>
      <AppNav user={user} />
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4">
        <h1 className="text-2xl font-semibold">Dashboard Kehadiran</h1>
        <DashboardClient />
      </main>
    </>
  );
}
