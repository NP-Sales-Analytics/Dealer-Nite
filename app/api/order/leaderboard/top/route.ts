import { NextResponse } from 'next/server';
import type { LeaderRow } from '@/lib/order/leaderboard';
import { papan } from '@/lib/order/papan';

/**
 * Podium 1-3, SAMA untuk siapa pun yang memanggilnya. Inilah endpoint yang
 * ditembak ratusan customer, jadi ia dirancang supaya bisa dilayani CDN Vercel
 * di edge - tanpa menyentuh server maupun database.
 *
 * Konsekuensi yang harus disadari: `public` berarti CDN menyimpan SATU salinan
 * dan menyajikannya tanpa menjalankan fungsi ini lagi. Jadi pemeriksaan sesi di
 * sini akan percuma - permintaan berikutnya tidak pernah sampai ke kode ini.
 * Karena itu isinya sengaja dibatasi pada yang memang layak dilihat siapa saja:
 * tiga nama toko teratas dan jumlah dusnya - persis yang tampil di layar venue.
 *
 * Yang TIDAK boleh ada di sini: kode_sap (kredensial login), wilayah/region,
 * peringkat 4 ke bawah, dan posisi per-customer. Papan penuh milik tim tetap di
 * /api/order/leaderboard yang privat; posisi pribadi di /api/order/me.
 */
const CACHE = {
  // s-maxage: umur di CDN. stale-while-revalidate: selama 30 detik berikutnya
  // CDN boleh menyajikan salinan lama sambil menyegarkan di latar, jadi tidak
  // ada satu pun pembaca yang menunggu query.
  'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=30',
};

export async function GET() {
  const semua = await papan.get();

  // Daftar-putih, bukan daftar-hitam: kolom baru di papan tidak akan ikut
  // tersiar ke publik kecuali sengaja ditambahkan di sini.
  const top: LeaderRow[] = semua.slice(0, 3).map((r) => ({
    customerId: r.customerId,
    namaToko: r.namaToko,
    depot: r.depot,
    total: r.total,
    rank: r.rank,
    terakhir: r.terakhir,
  }));

  return NextResponse.json({ top }, { headers: CACHE });
}
