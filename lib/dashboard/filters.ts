import type { NextRequest } from 'next/server';

export type DashboardFilter = {
  region: string | null;
  depot: string | null;
  q: string | null;
};

const bersih = (v: string | null) => {
  const s = (v ?? '').trim();
  return s.length > 0 && s !== 'semua' ? s : null;
};

export function readFilter(request: NextRequest): DashboardFilter {
  const p = request.nextUrl.searchParams;
  return { region: bersih(p.get('region')), depot: bersih(p.get('depot')), q: bersih(p.get('q')) };
}

/** Kunci cache: kombinasi filter yang sama harus memakai hasil yang sama. */
export const filterKey = (f: DashboardFilter) => `${f.region ?? ''}|${f.depot ?? ''}|${f.q ?? ''}`;

/**
 * Region hanya ada di master data customer. Manual entry tidak punya region,
 * jadi memfilter per region memang mengeluarkannya - itu perilaku yang
 * diharapkan, bukan bug.
 */
export const CATATAN_REGION_MANUAL =
  'Manual entry tidak punya region sehingga tidak muncul saat filter region dipakai.';
