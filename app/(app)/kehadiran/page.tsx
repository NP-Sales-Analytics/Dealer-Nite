import { AttendanceClient } from '@/components/kehadiran/attendance-client';
import { PageHeader } from '@/components/shared/page-header';
import { requireRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function KehadiranPage() {
  const user = await requireRole(['superadmin', 'admin_rsvp', 'rsm']);

  // RSM hanya memantau; yang boleh mengoreksi catatan adalah yang mencatat.
  // API PATCH/DELETE menegakkan aturan yang sama, ini hanya menyembunyikan
  // tombol yang pasti ditolak.
  const bisaUbah = user.role === 'superadmin' || user.role === 'admin_rsvp';

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Toko Hadir"
        subtitle="Daftar toko yang sudah tercatat hadir. Cari, saring per region atau depot, dan koreksi bila perlu."
      />
      <AttendanceClient bisaUbah={bisaUbah} />
    </div>
  );
}
