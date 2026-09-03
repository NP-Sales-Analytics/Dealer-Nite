import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// /order dan /leaderboard pakai sesi customer (cookie tersendiri), bukan Supabase
// Auth. Tanpa ini, middleware me-redirect mereka ke /login admin. Otorisasi
// customer ditegakkan di dalam route/page-nya lewat getCustomerId/requireCustomerApi.
const PUBLIC_PATHS = ['/login', '/auth', '/order', '/leaderboard'];

// Token berlaku 1 jam. Diperbarui saat sisanya tinggal 10 menit, jadi request
// biasa tidak perlu menghubungi Supabase sama sekali.
const AMBANG_PERBARUI_MS = 10 * 60_000;

/**
 * Membaca expires_at dari cookie sesi tanpa memanggil jaringan.
 *
 * @supabase/ssr menyimpan sesi sebagai JSON ber-base64, dipecah jadi beberapa
 * cookie bila panjang. Setiap kegagalan parsing mengembalikan null sehingga
 * pemanggil jatuh ke jalur verifikasi penuh - gagal ke arah aman, bukan
 * meloloskan request.
 */
function sisaBerlakuMs(request: NextRequest): number | null {
  const semua = request.cookies.getAll();
  const potongan = semua
    .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (potongan.length === 0) return null;

  try {
    const mentah = potongan.map((c) => c.value).join('');
    if (!mentah.startsWith('base64-')) return null;
    const sesi = JSON.parse(Buffer.from(mentah.slice(7), 'base64url').toString());
    if (typeof sesi?.expires_at !== 'number') return null;
    return sesi.expires_at * 1000 - Date.now();
  } catch {
    return null;
  }
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const rutaApi = pathname.startsWith('/api');

  // Rute API tidak pernah di-redirect: klien fetch butuh 401 yang bisa dibaca,
  // bukan halaman login berformat HTML. Otorisasinya tetap ditegakkan di route
  // handler lewat requireRoleApi.
  //
  // Selama token masih jauh dari kedaluwarsa, tidak ada yang perlu dikerjakan
  // di sini. Ini menghemat satu round-trip jaringan ke Supabase (terukur ~128ms)
  // pada hampir setiap panggilan API, termasuk polling dashboard tiap 15 detik.
  if (rutaApi) {
    const sisa = sisaBerlakuMs(request);
    if (sisa !== null && sisa > AMBANG_PERBARUI_MS) return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getClaims(), BUKAN getUser(): tanda tangan JWT diverifikasi lokal lewat
  // WebCrypto (kunci ES256 proyek ini), jadi navigasi antar halaman tidak lagi
  // membayar round-trip ~128ms ke Supabase. Lihat lib/auth.ts untuk alasan
  // lengkap dan batasnya.
  //
  // Pemanggilan di sinilah yang membuat token diperbarui dan cookie barunya
  // ditulis saat mendekati kedaluwarsa; route handler tidak bisa menulis cookie,
  // jadi hanya di sini perpanjangan sesi bisa terjadi. Karena itu rute halaman
  // sengaja TIDAK diberi fast-path seperti rute API di atas.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims && !rutaApi && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
