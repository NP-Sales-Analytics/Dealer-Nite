import { WaktuForm } from '@/components/setting/waktu-form';
import { requireHalaman } from '@/lib/auth';
import { bacaTenggat } from '@/lib/settings';

export const dynamic = 'force-dynamic';

// sv-SE memberi format "2026-09-05 20:00" - dua bagiannya persis yang dibutuhkan
// <input type="date"> dan <input type="time">, tanpa merakit string sendiri.
const FORMAT_JAKARTA = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export default async function WaktuPenambahanPage() {
  await requireHalaman('/setting/waktu');

  const tenggat = await bacaTenggat();
  const [tanggal, waktu] = tenggat ? FORMAT_JAKARTA.format(new Date(tenggat)).split(' ') : ['', ''];
  const [jam, menit] = waktu ? waktu.split(':') : ['', ''];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <WaktuForm tenggat={tenggat} tanggalAwal={tanggal} jamAwal={jam} menitAwal={menit} />
    </div>
  );
}
