import { CheckinForm } from '@/components/reservation/checkin-form';
import { PageHeader } from '@/components/shared/page-header';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export default async function ReservationPage() {
  await requireRole(['superadmin', 'admin_rsvp']);

  // Daftar depot untuk autocomplete manual entry: 35 nilai, cukup dikirim sebagai prop.
  const rows = await db.selectDistinct({ depot: customers.depot }).from(customers);
  const depots = rows.map((r) => r.depot).filter((d): d is string => !!d).sort();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Pencatatan Kehadiran"
        subtitle="Cari toko dengan nama atau kode SAP, lalu isi jumlah orang yang hadir."
      />
      <CheckinForm depots={depots} />
    </div>
  );
}
