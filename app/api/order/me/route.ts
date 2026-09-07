import { NextResponse } from 'next/server';
import { infoCustomer } from '@/lib/auth';
import { cariPosisi, podium } from '@/lib/order/leaderboard';
import { papan } from '@/lib/order/papan';
import { getCustomerId } from '@/lib/session';
import { bacaTenggat } from '@/lib/settings';

// no-store, BUKAN max-age=5. Endpoint ini nol query DB, jadi cache browser 5
// detik nyaris tidak menghemat apa pun - tapi cukup untuk menyajikan angka lama
// pada refetch tepat sesudah customer menekan Simpan, dan itulah yang dulu
// membuat perubahan sendiri terasa tidak langsung muncul.
const CACHE = {
  'Cache-Control': 'private, no-store',
  Vary: 'Cookie',
};

/**
 * Semua yang dibutuhkan layar customer: identitas, total dus, posisi ranking,
 * DAN podium tiga besar - semuanya dari SATU snapshot papan.
 *
 * Podium ikut di sini, bukan di endpoint terpisah, justru itu intinya. Dulu
 * podium punya endpoint sendiri yang boleh disimpan CDN (s-maxage=15 +
 * stale-while-revalidate=30, basi sampai 45 detik) sementara posisi pribadi
 * tidak - jadi keduanya melihat dua snapshot berbeda dan sering menyebut angka
 * yang bertentangan di layar yang sama. Karena keduanya kini berasal dari satu
 * array yang sama di satu response yang sama, itu mustahil terjadi lagi.
 *
 * Tetap nol query DB: identitas dari cache customer (60 detik), papan dari cache
 * 2 detik, tenggat dari cache 30 detik. Menambahkan podium tidak menambah satu
 * query pun - array-nya memang sudah diambil untuk menghitung posisi.
 */
export async function GET() {
  const customerId = await getCustomerId();
  if (!customerId) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  const info = await infoCustomer(customerId);
  if (!info) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  const semua = await papan.get();
  const { total, rank, terakhir } = cariPosisi(semua, customerId);

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
      // Dari array yang sama dengan cariPosisi di atas - lihat komentar fungsi.
      top: podium(semua),
    },
    { headers: CACHE },
  );
}
