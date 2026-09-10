import { AttendanceClient } from '@/components/kehadiran/attendance-client';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function KehadiranPage() {
  const user = await requireHalaman('/kehadiran');

  // RSM hanya memantau; yang boleh mengoreksi catatan adalah yang mencatat.
  // API PATCH/DELETE menegakkan aturan yang sama, ini hanya menyembunyikan
  // tombol yang pasti ditolak.
  const bisaUbah = user.role === 'superadmin' || user.role === 'admin_rsvp';

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Izin unduh diputuskan di server dan dikirim sebagai prop. Route
          ekspornya tetap memeriksa sendiri - ini hanya menyembunyikan tombol
          yang pasti ditolak, bukan pengamanannya. */}
      <AttendanceClient bisaUbah={bisaUbah} bisaUnduh={user.bolehUnduh} />
    </div>
  );
}
