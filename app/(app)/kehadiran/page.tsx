import { AttendanceClient } from '@/components/kehadiran/attendance-client';
import { bolehHalaman, requireHalaman } from '@/lib/auth';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function KehadiranPage() {
  const user = await requireHalaman('/kehadiran');
  const dealerNights = await dealerNightOptionsFor(user);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Koreksi catatan mengikuti izin halaman Pencatatan; API PATCH/DELETE
          menegakkan aturan yang sama. */}
      <AttendanceClient
        bisaUbah={bolehHalaman(user, '/reservation')}
        bisaUnduh={user.role !== 'dn_user'}
        dealerNights={dealerNights}
      />
    </div>
  );
}
