'use client';

import { CalendarDays, Save, Target, Users } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { simpanSettingPax } from '@/app/(app)/setting/pax/actions';
import { temaKupon } from '@/components/kupon/status';
import { Button } from '@/components/ui/button';
import { PilihBanyak } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import type { DealerNightTargetPax } from '@/lib/pax-targets';
import { formatRupiahRingkas } from '@/lib/target/money';
import { cn } from '@/lib/utils';

// Dealer Night | Target DN | Pax | Pembagi slot besar | Pembagi slot kecil
const KOLOM = 'lg:grid-cols-[minmax(0,1fr)_12rem_7.5rem_12rem_12rem]';

const angka = (value: string) => {
  const n = Number(value.replace(/[^0-9]/g, ''));
  return Number.isSafeInteger(n) ? n : 0;
};

const tanggal = (iso?: string | null) => (iso
  ? new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  : 'Tanggal belum diatur');

export function PaxTargetForm({ rows }: { rows: DealerNightTargetPax[] }) {
  const [pax, setPax] = useState<Record<string, string>>(
    () => Object.fromEntries(rows.map((row) => [row.id, String(row.targetPax)])),
  );
  const [targetDn, setTargetDn] = useState<Record<string, string>>(
    () => Object.fromEntries(rows.map((row) => [row.id, String(row.targetDn)])),
  );
  const [kupon, setKupon] = useState<Record<string, { pink: string; hijau: string }>>(
    () => Object.fromEntries(rows.map((row) => [row.id, {
      pink: String(row.kupon.nilai.pink), hijau: String(row.kupon.nilai.hijau),
    }])),
  );
  const [pending, start] = useTransition();
  const ubahKupon = (id: string, slot: 'pink' | 'hijau', value: string) =>
    setKupon((lama) => ({ ...lama, [id]: { ...lama[id], [slot]: value } }));

  // Filter hanya menyembunyikan baris (CSS), tidak membuangnya dari form:
  // Simpan tetap mengirim semua DN sehingga isian di baris tersembunyi tidak hilang.
  const [filterWilayah, setFilterWilayah] = useState<string[]>([]);
  const [filterDn, setFilterDn] = useState<string[]>([]);
  const daftarWilayah = useMemo(
    () => [...new Set(rows.map((row) => row.wilayah).filter((v): v is string => !!v))].sort(),
    [rows],
  );
  const tampil = (row: DealerNightTargetPax) =>
    (filterWilayah.length === 0 || (!!row.wilayah && filterWilayah.includes(row.wilayah)))
    && (filterDn.length === 0 || filterDn.includes(row.name));
  const terlihat = rows.filter(tampil);

  const total = useMemo(() => ({
    pax: terlihat.reduce((sum, row) => sum + angka(pax[row.id] ?? '0'), 0),
    dn: terlihat.reduce((sum, row) => sum + angka(targetDn[row.id] ?? '0'), 0),
  }), [terlihat, pax, targetDn]);

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
        Belum ada Dealer Night aktif yang bisa Anda atur.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selalu dua kolom; di HP lebih ringkas supaya tidak memanjang ke bawah. */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-3 shadow-xs sm:p-5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary sm:size-10 sm:rounded-xl">
            <Target className="size-4 sm:size-5" />
          </span>
          <p className="mt-2 text-xs text-muted-foreground sm:mt-3 sm:text-sm">Total Target DN</p>
          <p className="text-xl font-bold tracking-tight tabular-nums sm:text-3xl">{formatRupiahRingkas(total.dn)}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">dari {terlihat.length} Dealer Night</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-xs sm:p-5">
          <span className="grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground sm:size-10 sm:rounded-xl">
            <Users className="size-4 sm:size-5" />
          </span>
          <p className="mt-2 text-xs text-muted-foreground sm:mt-3 sm:text-sm">Total Target Pax</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{total.pax}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">orang dari {rows.length} Dealer Night</p>
        </div>
      </div>

      <form
        action={(formData) => start(async () => {
          const pesan = await simpanSettingPax(formData);
          if (pesan) {
            toast.error(pesan);
            return;
          }
          toast.success('Target Dealer Night berhasil disimpan.');
        })}
      >
        <div className="rounded-2xl border border-border bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h2 className="font-semibold">Target per Dealer Night</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Pembagi kupon = nilai target untuk 1 kupon.
              </p>
            </div>
            <Button type="submit" className="h-11 gap-2 px-5" disabled={pending}>
              <Save className="size-4" />
              {pending ? 'Menyimpan...' : 'Simpan Target'}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2.5 border-b border-border px-4 py-3 sm:px-5">
            <PilihBanyak
              items={daftarWilayah}
              value={filterWilayah}
              onChange={setFilterWilayah}
              labelSemua="Wilayah"
              satuan="Wilayah"
              cariPlaceholder="Cari wilayah..."
              kosong="Wilayah tidak ditemukan."
              className="min-w-0 flex-1 sm:w-48 sm:flex-none"
            />
            <PilihBanyak
              items={rows.filter((row) => filterWilayah.length === 0 || (!!row.wilayah && filterWilayah.includes(row.wilayah))).map((row) => row.name)}
              value={filterDn}
              onChange={setFilterDn}
              labelSemua="Dealer Night"
              satuan="DN"
              cariPlaceholder="Cari Dealer Night..."
              kosong="Dealer Night tidak ditemukan."
              className="min-w-0 flex-1 sm:w-56 sm:flex-none"
            />
            {(filterWilayah.length > 0 || filterDn.length > 0) && (
              <Button type="button" variant="outline" className="h-11 shrink-0 px-4" onClick={() => { setFilterWilayah([]); setFilterDn([]); }}>
                Reset
              </Button>
            )}
          </div>

          <div className={cn(KOLOM, 'hidden gap-4 border-b border-border bg-secondary/40 px-5 py-2.5 text-xs font-medium text-muted-foreground lg:grid')}>
            <span>Dealer Night</span>
            <span>Total Target DN</span>
            <span>Target Pax</span>
            <span>Pembagi Kupon Pink / Putih</span>
            <span>Pembagi Kupon Hijau / Kuning</span>
          </div>

          <div className="divide-y divide-border">
            {terlihat.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">Tidak ada Dealer Night yang cocok dengan filter.</p>
            )}
            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(KOLOM, 'grid grid-cols-2 gap-2.5 px-4 py-4 sm:gap-3 sm:px-5 lg:items-center lg:gap-4', !tampil(row) && 'hidden')}
              >
                <div className="col-span-2 min-w-0 lg:col-span-1">
                  <p className="font-medium">{row.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {tanggal(row.eventDate)}
                  </p>
                </div>
                <label className="relative block">
                  <span className="sr-only">Total Target DN {row.name}</span>
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs text-muted-foreground">Rp</span>
                  <Input
                    name="targetDn"
                    inputMode="numeric"
                    value={angka(targetDn[row.id] ?? '0').toLocaleString('id-ID')}
                    onChange={(event) => setTargetDn((lama) => ({ ...lama, [row.id]: event.target.value }))}
                    className="h-11 pl-9 text-right font-semibold tabular-nums"
                  />
                </label>
                <label className="relative block">
                  <span className="sr-only">Target pax {row.name}</span>
                  <Input
                    name="targetPax"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={1_000_000}
                    step={1}
                    required
                    value={pax[row.id] ?? ''}
                    onChange={(event) => setPax((lama) => ({ ...lama, [row.id]: event.target.value }))}
                    className="h-11 pr-11 text-right tabular-nums"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">pax</span>
                </label>
                {(['pink', 'hijau'] as const).map((slot) => {
                  const tema = temaKupon(row.kupon)[slot];
                  return (
                    <label key={slot} className="relative block">
                      <span className="sr-only">Pembagi kupon {tema.label} {row.name}</span>
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <span className={cn('size-2.5 rounded-full', tema.dot)} aria-hidden />
                        {/* Di HP cukup titik warnanya; kolom terlalu sempit untuk label + angka. */}
                        <span className="hidden sm:inline">{tema.label}</span>
                      </span>
                      <Input
                        name={slot === 'pink' ? 'nilaiKuponPink' : 'nilaiKuponHijau'}
                        inputMode="numeric"
                        value={angka(kupon[row.id]?.[slot] ?? '0').toLocaleString('id-ID')}
                        onChange={(event) => ubahKupon(row.id, slot, event.target.value)}
                        className="h-11 pl-8 text-right font-semibold tabular-nums sm:pl-20"
                      />
                    </label>
                  );
                })}
                <input type="hidden" name="dealerNightId" value={row.id} />
              </div>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
