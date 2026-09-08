import { CustomerBoard } from '@/components/leaderboard/customer-board';
import { LeaderboardClient } from '@/components/leaderboard/leaderboard-client';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const user = await requireHalaman('/leaderboard');
  // Customer mendapat halaman gabungan: papan peringkat DAN penambahan order
  // dalam satu layar, supaya tidak perlu membuka menu untuk pindah halaman.
  // Tim tetap memakai papan penuh berikut pencariannya - tidak ada yang berubah
  // bagi mereka. Perannya ditentukan di sini, di server, bukan ditebak di klien.
  return user.role === 'customer' ? <CustomerBoard /> : <LeaderboardClient />;
}
