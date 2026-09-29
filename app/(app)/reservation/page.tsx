import { CheckinForm } from '@/components/reservation/checkin-form';
import { requireHalaman } from '@/lib/auth';
import { semuaDepot } from '@/lib/dashboard/hierarchy';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { ttlCache } from '@/lib/ttl-cache';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

/**
 * Daftar depot untuk dropdown Tamu Manual.
 *
 * Hierarki resmi (public/Hierarchy Depot.csv) DIGABUNG dengan depot yang benar-
 * benar ada di master customer, bukan salah satunya saja. Hierarki sendiri
 * belum tentu lengkap terhadap data lapangan, sedangkan data lapangan tidak
 * memuat depot yang belum punya toko - dan admin tetap harus bisa memilih
 * keduanya. Digabung, tidak ada depot yang mendadak hilang dari pilihan.
 *
 * Di-cache 5 menit; ttlCache sekalian men-dedup kalau beberapa admin membuka
 * halaman ini bersamaan saat cachenya dingin.
 */
const daftarDepot = ttlCache(async () => {
  const rows = await db.selectDistinct({ depot: customers.depotName }).from(customers);
  const dariData = rows.map((r) => r.depot).filter((d): d is string => !!d);
  return [...new Set([...semuaDepot(), ...dariData])].sort((a, b) => a.localeCompare(b, 'id'));
}, 5 * 60_000);

export default async function ReservationPage() {
  const user = await requireHalaman('/reservation');

  const depots = await daftarDepot.get();
  const dealerNights = await dealerNightOptionsFor(user);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <CheckinForm
        depots={depots}
        dealerNights={dealerNights}
        initialDealerNightId={user.dealerNightId ?? dealerNights[0]?.id ?? ''}
        fixedDealerNight={user.role === 'dn_user'}
      />
    </div>
  );
}
