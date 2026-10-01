import { cakupanDepot } from '@/lib/access';
import type { SessionUser } from '@/lib/auth';
import type { DashboardFilter } from '@/lib/dashboard/filters';
import { depotPerKode } from '@/lib/dashboard/hierarchy';

type Pengguna = Pick<SessionUser, 'role' | 'depotCodes'>;

/** Nama depot yang boleh diakses (untuk data yang hanya menyimpan nama depot). */
export function namaDepotDiizinkan(user: Pengguna): Set<string> | null {
  const kode = cakupanDepot(user);
  if (!kode) return null;
  const peta = depotPerKode();
  return new Set(kode.map((k) => peta.get(k)?.depot ?? k));
}

export const bolehNamaDepot = (user: Pengguna, nama: string | null | undefined) => {
  const izin = namaDepotDiizinkan(user);
  return !izin || (!!nama && izin.has(nama));
};

/** Mempersempit filter dashboard ke depot milik user; tidak pernah melebar. */
export function batasiFilterDepot(user: Pengguna, filter: DashboardFilter): DashboardFilter {
  const izin = namaDepotDiizinkan(user);
  if (!izin) return filter;
  const depot = filter.depot.length > 0 ? filter.depot.filter((d) => izin.has(d)) : [...izin];
  // Daftar kosong berarti "semua" di filter dashboard, jadi pakai nilai mustahil.
  return { ...filter, depot: depot.length > 0 ? depot : ['\u0000tanpa-akses'] };
}
