'use client';

import { Save, Users } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { simpanSettingPax } from '@/app/(app)/setting/pax/actions';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import {
  adaFilterAktif,
  FilterBar,
  FILTER_KOSONG,
  type FilterState,
} from '@/components/dashboard/filter-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DepotTargetPax } from '@/lib/pax-targets';
import { cn } from '@/lib/utils';

const cocokFilter = (row: DepotTargetPax, filter: FilterState) =>
  (filter.wilayah.length === 0 || (!!row.wilayah && filter.wilayah.includes(row.wilayah)))
  && (filter.region.length === 0 || (!!row.region && filter.region.includes(row.region)))
  && (filter.depot.length === 0 || filter.depot.includes(row.depot));

export function PaxTargetForm({ depots, dealerNightId }: { depots: DepotTargetPax[]; dealerNightId: string }) {
  const [nilai, setNilai] = useState<Record<string, string>>(
    () => Object.fromEntries(depots.map((row) => [row.depot, String(row.targetPax)])),
  );
  const [filter, setFilter] = useState<FilterState>(FILTER_KOSONG);
  const [pending, start] = useTransition();

  const total = useMemo(
    () => Object.values(nilai).reduce((sum, value) => {
      const angka = Number(value);
      return sum + (Number.isInteger(angka) && angka >= 0 ? angka : 0);
    }, 0),
    [nilai],
  );

  const options = useMemo<FilterOptions>(() => ({
    wilayahs: [...new Set(depots.map((row) => row.wilayah).filter((v): v is string => !!v))],
    regions: [...new Map(
      depots
        .filter((row): row is DepotTargetPax & { region: string } => !!row.region)
        .map((row) => [row.region, { region: row.region, wilayah: row.wilayah }]),
    ).values()],
    depots: depots.map((row) => ({
      depot: row.depot,
      region: row.region,
      wilayah: row.wilayah,
    })),
  }), [depots]);

  const depotTampil = useMemo(
    () => new Set(depots.filter((row) => cocokFilter(row, filter)).map((row) => row.depot)),
    [depots, filter],
  );
  const adaFilter = adaFilterAktif(filter);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
          <span className="grid size-10 place-items-center rounded-xl bg-secondary text-muted-foreground">
            <Users className="size-5" />
          </span>
          <p className="mt-3 text-sm text-muted-foreground">Total Target Pax</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{total}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">orang dari {depots.length} depot</p>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-4 text-sm leading-relaxed sm:p-5">
          <p className="font-semibold">Sumber perhitungan dashboard</p>
          <p className="mt-1 text-muted-foreground">
            Persentase pax dihitung dari jumlah orang yang benar-benar hadir dibandingkan target
            di halaman ini. Jumlah pax pada undangan customer tidak lagi menjadi target dashboard.
          </p>
        </div>
      </div>

      <FilterBar value={filter} options={options} onChange={setFilter} />

      <form
        action={(formData) => start(async () => {
          const pesan = await simpanSettingPax(formData);
          if (pesan) {
            toast.error(pesan);
            return;
          }
          toast.success('Target pax seluruh depot berhasil disimpan.');
        })}
      >
        <input type="hidden" name="dealerNightId" value={dealerNightId} />
        <div className="rounded-2xl border border-border bg-card shadow-xs">
          {/* Header menempel di bawah header aplikasi, jadi tombol simpan tetap
              terjangkau saat daftar panjang digulir. */}
          <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-border bg-card/95 px-4 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:px-5 md:top-[68px]">
            <div className="min-w-0">
              <h2 className="font-semibold">Target per Depot</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {depotTampil.size} dari {depots.length} depot ditampilkan
                {adaFilter ? ' sesuai filter.' : '.'}
              </p>
            </div>
            <Button type="submit" className="h-11 gap-2 px-5" disabled={pending}>
              <Save className="size-4" />
              {pending ? 'Menyimpan...' : 'Simpan Target'}
            </Button>
          </div>

          {depotTampil.size === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
              Tidak ada depot yang cocok dengan filter ini.
            </p>
          )}

          {/* Baris yang tidak cocok hanya disembunyikan, bukan dikeluarkan dari
              form. Menyimpan saat filter aktif tetap membawa semua target. */}
          <div className="divide-y divide-border">
            {depots.map((row) => (
              <div
                key={row.depot}
                className={cn(
                  'grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center sm:px-5',
                  !depotTampil.has(row.depot) && 'hidden',
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium">{row.depot}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.wilayah ?? 'Tanpa wilayah'} · Region {row.region ?? '-'}
                  </p>
                </div>
                <div>
                  <label htmlFor={`target-${row.depot}`} className="sr-only">
                    Target pax {row.depot}
                  </label>
                  <div className="relative">
                    <Input
                      id={`target-${row.depot}`}
                      name="targetPax"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={1_000_000}
                      step={1}
                      required
                      value={nilai[row.depot] ?? ''}
                      onChange={(event) => setNilai((lama) => ({
                        ...lama,
                        [row.depot]: event.target.value,
                      }))}
                      className="h-11 pr-12 text-right tabular-nums"
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                      pax
                    </span>
                  </div>
                  <input type="hidden" name="depot" value={row.depot} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
