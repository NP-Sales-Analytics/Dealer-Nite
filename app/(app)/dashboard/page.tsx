import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { PageHeader } from '@/components/shared/page-header';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await requireRole(['superadmin', 'rsm']);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Dashboard Kehadiran"
        subtitle="Rekap kehadiran tamu undangan, diperbarui otomatis tiap 15 detik."
      />
      <DashboardClient />
    </div>
  );
}
