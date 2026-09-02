import { AppNav } from '@/components/shared/app-nav';
import { CheckinForm } from '@/components/reservation/checkin-form';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export default async function ReservationPage() {
  const user = await requireRole(['superadmin', 'admin_rsvp']);

  // Daftar depot untuk autocomplete manual entry: 35 nilai, cukup dikirim sebagai prop.
  const rows = await db.selectDistinct({ depot: customers.depot }).from(customers);
  const depots = rows.map((r) => r.depot).filter((d): d is string => !!d).sort();

  return (
    <>
      <AppNav user={user} />
      <main className="mx-auto w-full max-w-2xl p-4">
        <h1 className="mb-1 text-2xl font-semibold">Pencatatan Kehadiran</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Cari toko dengan nama atau kode SAP, lalu isi jumlah orang yang hadir.
        </p>
        <CheckinForm depots={depots} />
      </main>
    </>
  );
}
