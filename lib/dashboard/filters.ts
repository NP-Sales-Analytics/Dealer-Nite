import { sql, type SQL } from 'drizzle-orm';
import type { NextRequest } from 'next/server';
import { daftarRegion } from '@/lib/access';
import type { Role } from '@/lib/auth';

export type DashboardFilter = {
  /**
   * Ketiganya bisa lebih dari satu. Daftar KOSONG berarti "semua", bukan
   * "tidak ada" - penyaring yang tidak dipakai harus meloloskan segalanya.
   */
  wilayah: string[];
  region: string[];
  depot: string[];
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

/**
 * Daftar dipisah koma di query string.
 *
 * Nama depot memang bisa mengandung spasi ("1A Jakarta") tapi tidak pernah
 * mengandung koma - sudah dipastikan terhadap Hierarchy Depot.csv - jadi koma
 * aman jadi pemisah tanpa perlu pengkodean tambahan.
 */
const bersihDaftar = (v: string | null) => {
  const s = (v ?? '').trim();
  if (!s || s === 'semua') return [];
  return [...new Set(s.split(',').map((x) => x.trim()).filter(Boolean))];
};

export function readFilter(request: NextRequest): DashboardFilter {
  const p = request.nextUrl.searchParams;
  return {
    wilayah: bersihDaftar(p.get('wilayah')),
    region: bersihDaftar(p.get('region')),
    depot: bersihDaftar(p.get('depot')),
    q: bersih(p.get('q')),
    kodeSap: null,
  };
}

/**
 * Kondisi SQL untuk penyaring berdaftar: lolos semua bila daftarnya kosong.
 *
 * Dipakai bersama supaya keenam route memakai aturan yang sama persis - kalau
 * satu route menuliskannya sendiri lalu keliru, yang bocor adalah data di luar
 * cakupan, dan itu tidak terlihat sampai ada yang mengeceknya.
 */
export const cocokSalahSatu = (kolom: SQL, pilihan: string[]): SQL =>
  // Daftar kosong = tidak menyaring. Dikembalikan sebagai `true` alih-alih
  // pemeriksaan cardinality, supaya tidak ada parameter array kosong yang perlu
  // dikirim sama sekali.
  pilihan.length === 0
    ? sql`true`
    // sql.param, BUKAN interpolasi biasa: drizzle merentangkan array JS menjadi
    // daftar berkoma "(p1, p2)" untuk keperluan IN (...), dan bentuk itu bukan
    // array yang bisa dipakai `= any(...)`. sql.param mengikatnya sebagai SATU
    // nilai, sehingga postgres.js mengirimnya sebagai array Postgres sungguhan.
    : sql`${kolom} = any(${sql.param(pilihan)}::text[])`;

/**
 * Memaksakan cakupan data milik akun ke atas filter yang diminta.
 *
 * Menimpa, bukan menggabung: RSM yang cakupannya region 3A tetap terkunci di 3A
 * (atau, untuk RSM multi-region, ke daftar regionnya) walaupun query string-nya
 * meminta region lain. Karena itu fungsi ini harus dipanggil SESUDAH readFilter
 * dan SEBELUM filterKey - hasilnya ikut masuk kunci cache, sehingga dua user
 * dengan cakupan berbeda tidak pernah berbagi entri cache.
 *
 * Role selain rsm dan customer melihat seluruh data, jadi filternya lewat
 * apa adanya.
 */
export function terapkanScope(
  f: DashboardFilter,
  user: { role: Role; dataScope: string | null },
): DashboardFilter {
  if (!user.dataScope) return f;
  // Menimpa seluruh daftar, bukan menambah: RSM tetap terkunci ke regionnya
  // sendiri walau query string-nya menyodorkan region lain.
  if (user.role === 'rsm') return { ...f, region: daftarRegion(user.dataScope) };
  if (user.role === 'customer') return { ...f, kodeSap: user.dataScope };
  return f;
}

/**
 * Kunci cache: kombinasi filter yang sama harus memakai hasil yang sama.
 * Urutannya wilayah > region > depot, sama dengan hierarki datanya.
 */
export const filterKey = (f: DashboardFilter) =>
  // Daftar diurutkan supaya ["3A","3B"] dan ["3B","3A"] berbagi satu entri cache.
  `${[...f.wilayah].sort().join(',')}|${[...f.region].sort().join(',')}|${[...f.depot].sort().join(',')}|${f.q ?? ''}|${f.kodeSap ?? ''}`;

/** Kebalikan filterKey, dipakai di dalam fungsi yang di-cache. */
export function bacaKunci(key: string): DashboardFilter {
  const [wilayah, region, depot, q, kodeSap] = key.split('|');
  const daftar = (v: string) => (v ? v.split(',').filter(Boolean) : []);
  return {
    wilayah: daftar(wilayah),
    region: daftar(region),
    depot: daftar(depot),
    q: q || null,
    kodeSap: kodeSap || null,
  };
}

/** Manual entry memperoleh wilayah/region dari metadata target depot. */
export const CATATAN_REGION_MANUAL =
  'Manual entry mengikuti wilayah dan region dari depot yang dipilih.';
