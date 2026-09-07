import { NextResponse } from 'next/server';
import { infoCustomer } from '@/lib/auth';
import { cariPosisi, TOP_N, type LeaderRow } from '@/lib/order/leaderboard';
import { papan } from '@/lib/order/papan';
import { getSession } from '@/lib/session';

// Sepola dengan /api/dashboard/summary. Vary: Cookie wajib - payload untuk
// customer sengaja lebih sedikit kolomnya daripada untuk tim.
const CACHE = {
  'Cache-Control': 'private, max-age=5, stale-while-revalidate=30',
  Vary: 'Cookie',
};

export async function GET() {
  // Leaderboard bukan publik: butuh sesi (tim atau customer) apa pun.
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  // Satu papan tercache melayani semua pengunjung; lihat lib/order/papan.ts.
  const semua = await papan.get();

  /**
   * Dua pembatasan untuk sesi customer, keduanya ditegakkan DI SINI dan bukan di
   * UI - papan penuhnya tetap terbaca lewat DevTools kalau hanya disembunyikan:
   *
   * 1. Hanya juara 1-3 yang dikirim. Melihat peringkat toko lain memicu sentimen
   *    antar toko; yang relevan bagi sebuah toko hanya podium dan posisinya sendiri.
   * 2. kode_sap dibuang. Ia ADALAH kredensial login customer (lihat
   *    app/(auth)/login/actions.ts), jadi satu orang cukup memanennya untuk masuk
   *    sebagai toko lain. Daftar-putih, bukan daftar-hitam: kolom baru tidak ikut
   *    bocor kecuali sengaja ditambahkan di sini.
   */
  const terpilih = semua.slice(0, session.kind === 'team' ? TOP_N : 3);
  const top: LeaderRow[] =
    session.kind === 'team'
      ? terpilih
      : terpilih.map((r) => ({
          customerId: r.customerId,
          namaToko: r.namaToko,
          depot: r.depot,
          total: r.total,
          rank: r.rank,
          // Bukan data sensitif, dan justru menjelaskan kenapa peringkatnya begitu.
          terakhir: r.terakhir,
        }));

  let me = null;
  if (session.kind === 'customer') {
    // Diturunkan dari papan yang sama - tanpa query kedua, dan nomornya dijamin
    // identik dengan yang tampil di daftar.
    const { total, rank, terakhir } = cariPosisi(semua, session.id);
    // Toko tanpa dus tidak ada di papan, jadi identitasnya diambil dari cache
    // customer (60 detik). Tetap nol query di jalur panas.
    const info = semua.find((r) => r.customerId === session.id) ?? (await infoCustomer(session.id));
    if (info) {
      me = {
        customerId: session.id,
        namaToko: info.namaToko,
        depot: info.depot,
        total,
        rank,
        terakhir,
      };
    }
  }

  return NextResponse.json({ top, me }, { headers: CACHE });
}
