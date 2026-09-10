import { DetailOrderClient } from '@/components/order/detail-order-client';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DetailOrderPage() {
  const user = await requireHalaman('/order/detail');
  // Marketing & RSM hanya melihat. Tombol ubah/hapus/tambah disembunyikan di
  // sini dan tetap ditolak di route mutasinya - UI bukan penjaganya.
  const bisaUbah = user.role === 'superadmin' || user.role === 'admin_rsvp';

  return (
    <div className="mx-auto w-full max-w-6xl">
      <DetailOrderClient bisaUbah={bisaUbah} bisaUnduh={user.bolehUnduh} />
    </div>
  );
}
