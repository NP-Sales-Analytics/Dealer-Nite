import { NextResponse } from 'next/server';
import { infoCustomer } from '@/lib/auth';
import { cariPosisi } from '@/lib/order/leaderboard';
import { papan } from '@/lib/order/papan';
import { getCustomerId } from '@/lib/session';
import { bacaTenggat } from '@/lib/settings';

const CACHE = {
  'Cache-Control': 'private, max-age=5, stale-while-revalidate=30',
  Vary: 'Cookie',
};

/**
 * Identitas + total dus + posisi ranking milik customer yang sedang login.
 *
 * Jalur ini nol query DB: identitas dari cache customer (60 detik), total dan
 * peringkat diturunkan dari papan tercache (5 detik), tenggat dari cache 30
 * detik. Tenggat ikut menumpang di sini supaya hitung mundur di panel order
 * tidak butuh request sendiri.
 */
export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  const info = await infoCustomer(customerId);
  if (!info) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  const { total, rank, terakhir } = cariPosisi(await papan.get(), customerId);

  return NextResponse.json(
    {
      // customerId + terakhir dipakai halaman leaderboard: menandai "Anda" di
      // podium, dan menampilkan waktu pemecah seri di kartu posisi.
      customerId,
      namaToko: info.namaToko,
      kodeSap: info.kodeSap,
      depot: info.depot,
      wilayah: info.wilayah,
      region: info.region,
      total,
      rank,
      terakhir,
      dusAwal: info.dusAwal,
      tenggat: await bacaTenggat(),
    },
    { headers: CACHE },
  );
}
