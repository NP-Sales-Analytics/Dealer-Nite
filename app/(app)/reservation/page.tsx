import { CheckinForm } from '@/components/reservation/checkin-form';
import { PageHeader } from '@/components/shared/page-header';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { ttlCache } from '@/lib/ttl-cache';

export const dynamic = 'force-dynamic';

// Daftar depot untuk autocomplete manual entry: 35 nilai yang praktis tidak
// pernah berubah, tapi sebelumnya diquery ulang setiap kali halaman dibuka.
// Di-cache 5 menit; ttlCache sekalian men-dedup kalau beberapa admin membuka
// halaman ini bersamaan saat cachenya dingin.
const daftarDepot = ttlCache(async () => {
  const rows = await db.selectDistinct({ depot: customers.depot }).from(customers);
  return rows.map((r) => r.depot).filter((d): d is string => !!d).sort();
}, 5 * 60_000);

export default async function ReservationPage() {
  await requireRole(['superadmin', 'admin_rsvp']);

  const depots = await daftarDepot.get();

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
