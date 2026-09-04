import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await requireHalaman('/dashboard');

  return (
    <div className="mx-auto w-full max-w-7xl">
      <DashboardClient />
    </div>
  );
}
