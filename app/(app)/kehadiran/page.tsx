import { AttendanceClient } from '@/components/kehadiran/attendance-client';
import { requireHalaman } from '@/lib/auth';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function KehadiranPage() {
  const user = await requireHalaman('/kehadiran');

  // Akun Dealer Night hanya memantau; koreksi catatan dibatasi ke tim admin.
  // API PATCH/DELETE menegakkan aturan yang sama, ini hanya menyembunyikan
  // tombol yang pasti ditolak.
  const bisaUbah = user.role === 'superadmin' || user.role === 'admin';
  const dealerNights = await dealerNightOptionsFor(user);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* Izin unduh diputuskan di server dan dikirim sebagai prop. Route
          ekspornya tetap memeriksa sendiri - ini hanya menyembunyikan tombol
          yang pasti ditolak, bukan pengamanannya. */}
      <AttendanceClient
        bisaUbah={bisaUbah}
        bisaUnduh={user.role !== 'dn_user'}
        dealerNights={dealerNights}
        initialDealerNightId={user.dealerNightId ?? dealerNights[0]?.id ?? ''}
        fixedDealerNight={user.role === 'dn_user'}
      />
    </div>
  );
}
