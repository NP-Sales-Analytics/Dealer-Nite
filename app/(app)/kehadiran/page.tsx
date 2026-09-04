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
      <AttendanceClient bisaUbah={bisaUbah} />
    </div>
  );
}
