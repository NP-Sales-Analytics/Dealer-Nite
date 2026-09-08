import { NextResponse, type NextRequest } from 'next/server';

// Auth memakai cookie sesi custom (lib/session.ts), bukan Supabase Auth.
// Middleware hanya penjaga halaman: tanpa cookie -> ke /login. Verifikasi tanda
// tangan cookie dikerjakan di server (getSessionUser via requireHalaman/Role),
// bukan di edge runtime ini - jadi cookie palsu tetap ditolak di sana.
/**
 * Jenis sesi dibaca dari cookie TANPA memverifikasi tanda tangannya.
 *
 * Aman karena ini cuma menentukan ke mana halaman diarahkan, bukan gerbang
 * akses: cookie palsu tetap ditolak getSessionUser di server. Verifikasi HMAC
 * butuh node:crypto yang tidak ada di edge runtime ini.
 */
function jenisSesi(nilai: string | undefined): string | null {
  const body = nilai?.split('.')[0];
  if (!body) return null;
  try {
    return atob(body.replace(/-/g, '+').replace(/_/g, '/')).split(':')[0] ?? null;
  } catch {
    return null; // Cookie rusak - biarkan server yang menolaknya.
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rute API mengembalikan 401 sendiri lewat requireRoleApi/requireCustomerApi;
  // klien fetch butuh JSON, bukan redirect HTML.
  if (pathname.startsWith('/api')) return NextResponse.next();
  if (pathname === '/login' || pathname.startsWith('/auth')) return NextResponse.next();

  const sesi = request.cookies.get('pylox_session');
  if (!sesi) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Customer tidak punya halaman /order lagi - penambahan ordernya menyatu di
  // /leaderboard. Dialihkan DI SINI, bukan di page-nya: redirect dari server
  // component keluar sebagai meta-refresh 1 detik, dan satu detik memandangi
  // halaman yang salah sudah cukup membingungkan bagi tamu yang tidak terbiasa
  // dengan aplikasi. Dari sini balasannya 307 seketika.
  if (pathname === '/order' && jenisSesi(sesi.value) === 'customer') {
    const url = request.nextUrl.clone();
    url.pathname = '/leaderboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
