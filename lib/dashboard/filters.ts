import type { NextRequest } from 'next/server';
import type { Role } from '@/lib/auth';

export type DashboardFilter = {
  wilayah: string | null;
  region: string | null;
  depot: string | null;
  q: string | null;
  /**
   * Pembatas per-toko. TIDAK dibaca dari query string - hanya dipasang oleh
   * terapkanScope() dari profil user, karena inilah pembatas yang tidak boleh
   * bisa dilepas oleh pemanggilnya.
   */
  kodeSap: string | null;
};

const bersih = (v: string | null) => {
  const s = (v ?? '').trim();
  return s.length > 0 && s !== 'semua' ? s : null;
};

export function readFilter(request: NextRequest): DashboardFilter {
  const p = request.nextUrl.searchParams;
  return {
    wilayah: bersih(p.get('wilayah')),
    region: bersih(p.get('region')),
    depot: bersih(p.get('depot')),
    q: bersih(p.get('q')),
    kodeSap: null,
  };
}

/**
 * Memaksakan cakupan data milik akun ke atas filter yang diminta.
 *
 * Menimpa, bukan menggabung: RSM yang cakupannya region 3A tetap terkunci di 3A
 * walaupun query string-nya meminta 3B. Karena itu fungsi ini harus dipanggil
 * SESUDAH readFilter dan SEBELUM filterKey - hasilnya ikut masuk kunci cache,
 * sehingga dua user dengan cakupan berbeda tidak pernah berbagi entri cache.
 *
 * Role selain rsm dan customer melihat seluruh data, jadi filternya lewat
 * apa adanya.
 */
export function terapkanScope(
  f: DashboardFilter,
  user: { role: Role; dataScope: string | null },
): DashboardFilter {
  if (!user.dataScope) return f;
  if (user.role === 'rsm') return { ...f, region: user.dataScope };
  if (user.role === 'customer') return { ...f, kodeSap: user.dataScope };
  return f;
}

/**
 * Kunci cache: kombinasi filter yang sama harus memakai hasil yang sama.
 * Urutannya wilayah > region > depot, sama dengan hierarki datanya.
 */
export const filterKey = (f: DashboardFilter) =>
  `${f.wilayah ?? ''}|${f.region ?? ''}|${f.depot ?? ''}|${f.q ?? ''}|${f.kodeSap ?? ''}`;

/** Kebalikan filterKey, dipakai di dalam fungsi yang di-cache. */
export function bacaKunci(key: string): DashboardFilter {
  const [wilayah, region, depot, q, kodeSap] = key.split('|');
  return {
    wilayah: wilayah || null,
    region: region || null,
    depot: depot || null,
    q: q || null,
    kodeSap: kodeSap || null,
  };
}

/**
 * Wilayah dan region hanya ada di master data customer. Manual entry tidak
 * punya keduanya, jadi memfilter per wilayah/region memang mengeluarkannya -
 * itu perilaku yang diharapkan, bukan bug.
 */
export const CATATAN_REGION_MANUAL =
  'Manual entry tidak punya wilayah/region sehingga tidak muncul saat filter itu dipakai.';
