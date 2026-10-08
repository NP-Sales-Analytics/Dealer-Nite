import type { NextRequest } from 'next/server';
import { statusPax } from '@/lib/reservation/pax';

export type DashboardFilter = {
  wilayah: string[];
  region: string[];
  depot: string[];
  /** Hanya untuk daftar kehadiran: sesuai | melebihi | kurang | tanpa. */
  statusPax: string[];
  q: string | null;
  kodeSap: string | null;
};

const clean = (value: string | null) => {
  const result = (value ?? '').trim();
  return result && result !== 'semua' ? result : null;
};

const cleanList = (value: string | null) => {
  const result = clean(value);
  return result ? [...new Set(result.split(',').map((item) => item.trim()).filter(Boolean))] : [];
};

export function readFilter(request: NextRequest): DashboardFilter {
  const params = request.nextUrl.searchParams;
  return {
    wilayah: cleanList(params.get('wilayah')),
    region: cleanList(params.get('region')),
    depot: cleanList(params.get('depot')),
    statusPax: cleanList(params.get('statusPax')),
    q: clean(params.get('q')),
    kodeSap: null,
  };
}

export const filterKey = (filter: DashboardFilter) => JSON.stringify({
  ...filter,
  wilayah: [...filter.wilayah].sort(),
  region: [...filter.region].sort(),
  depot: [...filter.depot].sort(),
  statusPax: [...filter.statusPax].sort(),
});

export const bacaKunci = (key: string): DashboardFilter => JSON.parse(key) as DashboardFilter;

export function matchesDashboardFilter(
  row: {
    wilayah: string | null; region: string | null; depot: string; kodeSap?: string | null; nama?: string | null;
    qtyHadir?: number; paxTerdaftar?: number | null;
  },
  filter: DashboardFilter,
) {
  const query = filter.q?.toLocaleLowerCase('id') ?? null;
  return (filter.wilayah.length === 0 || (!!row.wilayah && filter.wilayah.includes(row.wilayah)))
    && (filter.region.length === 0 || (!!row.region && filter.region.includes(row.region)))
    && (filter.depot.length === 0 || filter.depot.includes(row.depot))
    && (filter.statusPax.length === 0
      || (row.qtyHadir !== undefined && filter.statusPax.includes(statusPax(row.qtyHadir, row.paxTerdaftar) ?? 'tanpa')))
    && (!filter.kodeSap || row.kodeSap === filter.kodeSap)
    && (!query || `${row.nama ?? ''} ${row.kodeSap ?? ''}`.toLocaleLowerCase('id').includes(query));
}

export const CATATAN_REGION_MANUAL = 'Manual entry mengikuti wilayah dan region dari depot yang dipilih.';
