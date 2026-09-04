'use client';

import { Search, X } from 'lucide-react';
import { useMemo } from 'react';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export type FilterState = { wilayah: string; region: string; depot: string; q: string };
export const FILTER_KOSONG: FilterState = { wilayah: 'semua', region: 'semua', depot: 'semua', q: '' };

export function FilterBar({
  value, options, onChange, withSearch = false, searchPlaceholder = 'Cari nama toko atau kode SAP...',
}: {
  value: FilterState;
  options: FilterOptions | undefined;
  onChange: (v: FilterState) => void;
  withSearch?: boolean;
  searchPlaceholder?: string;
}) {
  // Bertingkat mengikuti hierarki data: wilayah > region > depot. Memilih
  // tingkat atas mempersempit tingkat di bawahnya, karena kombinasi di luar
  // cabang yang dipilih dijamin menghasilkan nol baris.
  const regionTampil = useMemo(() => {
    const semua = options?.regions ?? [];
    if (value.wilayah === 'semua') return semua;
    return semua.filter((r) => r.wilayah === value.wilayah);
  }, [options, value.wilayah]);

  const depotTampil = useMemo(() => {
    let semua = options?.depots ?? [];
    // Tanpa toleransi null: region tiap depot sudah dilengkapi dari hierarki di
    // sisi server, jadi yang masih kosong memang benar-benar tidak diketahui dan
    // tidak boleh ikut muncul saat sebuah region dipilih.
    if (value.wilayah !== 'semua') semua = semua.filter((d) => d.wilayah === value.wilayah);
    if (value.region !== 'semua') semua = semua.filter((d) => d.region === value.region);
    return semua;
  }, [options, value.wilayah, value.region]);

  const aktif =
    value.wilayah !== 'semua' || value.region !== 'semua'
    || value.depot !== 'semua' || value.q.trim() !== '';

  // Tingkat di bawah selalu ikut direset supaya tidak tertinggal kombinasi
  // yang mustahil (misal Region 3B di dalam Indonesia Timur).
  const setWilayah = (wilayah: string) =>
    onChange({ ...value, wilayah, region: 'semua', depot: 'semua' });
  const setRegion = (region: string) =>
    onChange({ ...value, region, depot: 'semua' });

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-xs sm:mb-6 sm:p-4">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        {withSearch && (
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={value.q}
              onChange={(e) => onChange({ ...value, q: e.target.value })}
              placeholder={searchPlaceholder}
              aria-label="Cari toko"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
            />
            {value.q && (
              <button
                type="button"
                onClick={() => onChange({ ...value, q: '' })}
                aria-label="Hapus pencarian"
                className="absolute right-0 top-0 grid h-11 w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        )}

        {/* Tiga dropdown membungkus di HP, sebaris di layar lebar. */}
        <div className="flex flex-wrap gap-2.5">
          <Select value={value.wilayah} onValueChange={(v) => v && setWilayah(v)}>
            <SelectTrigger className="h-11 min-w-0 flex-1 data-[size=default]:h-11 sm:w-48 sm:flex-none">
              <SelectValue>
                {value.wilayah === 'semua' ? 'Semua Wilayah' : value.wilayah}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Wilayah</SelectItem>
              {(options?.wilayahs ?? []).map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={value.region} onValueChange={(v) => v && setRegion(v)}>
            <SelectTrigger className="h-11 min-w-0 flex-1 data-[size=default]:h-11 sm:w-44 sm:flex-none">
              <SelectValue>
                {value.region === 'semua' ? 'Semua Region' : `Region ${value.region}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Region</SelectItem>
              {regionTampil.map((r) => (
                <SelectItem key={r.region} value={r.region}>Region {r.region}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={value.depot} onValueChange={(v) => v && onChange({ ...value, depot: v })}>
            <SelectTrigger className="h-11 min-w-0 flex-1 data-[size=default]:h-11 sm:w-52 sm:flex-none">
              <SelectValue>
                {value.depot === 'semua' ? 'Semua Depot' : value.depot}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Depot</SelectItem>
              {depotTampil.map((d) => (
                <SelectItem key={d.depot} value={d.depot}>{d.depot}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {aktif && (
            <Button
              variant="outline"
              className="h-11 shrink-0 px-4"
              onClick={() => onChange(FILTER_KOSONG)}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
