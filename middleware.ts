import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

// Auth memakai cookie sesi custom dari lib/session.ts.
// Middleware hanya penjaga halaman: tanpa cookie -> ke /login. Verifikasi tanda
// tangan cookie dikerjakan di server (getSessionUser via requireHalaman/Role),
// bukan di edge runtime ini - jadi cookie palsu tetap ditolak di sana.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rute API mengembalikan 401 sendiri lewat requireRoleApi;
  // klien fetch butuh JSON, bukan redirect HTML.
  if (pathname.startsWith('/api')) return NextResponse.next();
  if (pathname === '/login' || pathname.startsWith('/auth')) return NextResponse.next();

  if (!request.cookies.get(SESSION_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
