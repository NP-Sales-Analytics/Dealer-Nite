'use client';

import { Search, X } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import { Button } from '@/components/ui/button';
import { PilihBanyak } from '@/components/ui/combobox';

/**
 * Ketiganya bisa dipilih lebih dari satu; daftar KOSONG berarti semua.
 *
 * Penyaring yang tidak dipakai harus meloloskan segalanya - itulah kenapa
 * "kosong" dan "semua" sengaja diwakili nilai yang sama, bukan sentinel
 * terpisah yang harus diingat di tiap pemanggil.
 */
export type FilterState = {
  wilayah: string[]; region: string[]; depot: string[]; hadir: string[]; tambah: string[]; q: string;
};
export const FILTER_KOSONG: FilterState = { wilayah: [], region: [], depot: [], hadir: [], tambah: [], q: '' };

/** Pilihan filter Kehadiran; teksnya sama dengan PillHadir. */
const HADIR = ['Sudah Hadir', 'Belum Hadir'];
const TAMBAH = ['Ada Penambahan', 'Tanpa Penambahan'];

/** Toko lolos filter Kehadiran? Tercatat check-in (qtyHadir terisi) = sudah hadir. */
export const lolosHadir = (f: FilterState, qtyHadir: number | null) =>
  f.hadir.length === 0 || f.hadir.includes(qtyHadir === null ? 'Belum Hadir' : 'Sudah Hadir');

/**
 * Toko lolos filter Penambahan? "Ada" = target berubah setelah verifikasi -
 * definisi yang sama dengan kolom Penambahan dan KPI "toko menyesuaikan".
 */
export const lolosTambah = (f: FilterState, targetVerifikasi: number | null, targetEfektif: number) =>
  f.tambah.length === 0
  || f.tambah.includes(targetVerifikasi != null && targetEfektif !== targetVerifikasi ? 'Ada Penambahan' : 'Tanpa Penambahan');

/**
 * Menuliskan filter ke query string - dipakai bersama ketiga halaman.
 *
 * Sengaja satu tempat: penggabungan koma di sini harus cocok persis dengan
 * pemisahannya di lib/dashboard/filters.ts. Kalau tiap halaman menuliskannya
 * sendiri, satu yang keliru menghasilkan halaman yang menyaring diam-diam
 * dengan cara berbeda dari dua lainnya.
 */
export function paramFilter(f: FilterState, p = new URLSearchParams()) {
  if (f.wilayah.length > 0) p.set('wilayah', f.wilayah.join(','));
  if (f.region.length > 0) p.set('region', f.region.join(','));
  if (f.depot.length > 0) p.set('depot', f.depot.join(','));
  if (f.q.trim()) p.set('q', f.q.trim());
  return p;
}

/** Apakah ada penyaring yang sedang aktif - untuk pesan "tidak ada yang cocok". */
export const adaFilterAktif = (f: FilterState) =>
  f.wilayah.length > 0 || f.region.length > 0 || f.depot.length > 0 || f.hadir.length > 0 || f.tambah.length > 0
  || f.q.trim() !== '';

type Tingkat = 'wilayah' | 'region' | 'depot';
type Simpul = { wilayah: string | null; region: string | null; depot: string };

const unik = (v: (string | null)[]) =>
  [...new Set(v.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, 'id'));

/** Sebuah simpul hierarki lolos bila cocok dengan SEMUA pilihan yang diberikan. */
const cocok = (s: Simpul, w: string[], r: string[], d: string[]) =>
  (w.length === 0 || (!!s.wilayah && w.includes(s.wilayah)))
  && (r.length === 0 || (!!s.region && r.includes(s.region)))
  && (d.length === 0 || d.includes(s.depot));

export function FilterBar({
  value, options, onChange, withSearch = false, searchPlaceholder = 'Cari nama toko atau MG Code...', filterToko = false, awal,
}: {
  value: FilterState;
  options: FilterOptions | undefined;
  onChange: (v: FilterState) => void;
  withSearch?: boolean;
  searchPlaceholder?: string;
  /**
   * Varian halaman per toko (Detail Target, Detail Kupon): tanpa Region, tambah
   * Kehadiran dan Penambahan. Penyaringannya di pemanggil lewat lolosHadir/lolosTambah.
   */
  filterToko?: boolean;
  /** Kontrol tambahan di depan dropdown, mis. pemilih Dealer Night. */
  awal?: ReactNode;
}) {
  // Satu daftar simpul wilayah>region>depot jadi sumber ketiga dropdown. Dari
  // sini penyempitannya bisa berjalan dua arah, bukan cuma menurun.
  const simpul = useMemo<Simpul[]>(() => options?.depots ?? [], [options]);

  /**
   * Isi sebuah dropdown: nilai yang masih mungkin menurut pilihan di DUA tingkat
   * lainnya.
   *
   * Tingkat itu sendiri dikecualikan dari penyaringan - kalau ikut disaring oleh
   * pilihannya sendiri, yang sudah terpilih akan jadi satu-satunya yang tampil
   * dan mustahil dilepas lagi.
   */
  const isi = (tingkat: Tingkat) =>
    unik(
      simpul
        .filter((s) =>
          cocok(
            s,
            tingkat === 'wilayah' ? [] : value.wilayah,
            tingkat === 'region' ? [] : value.region,
            tingkat === 'depot' ? [] : value.depot,
          ),
        )
        .map((s) => s[tingkat]),
    );

  const regionTampil = useMemo(() => isi('region'), [simpul, value.wilayah, value.depot]); // eslint-disable-line react-hooks/exhaustive-deps
  const depotTampil = useMemo(() => isi('depot'), [simpul, value.wilayah, value.region]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Menerapkan perubahan satu tingkat, lalu membuang pilihan di tingkat lain
   * yang jadi mustahil.
   *
   * Inilah sisi "dari bawah ke atas" yang diminta: memilih depot 1A Jakarta
   * ikut menggugurkan Indonesia Timur kalau kebetulan sedang terpilih. Tanpa
   * pembersihan itu, kombinasinya menghasilkan nol baris dan orang mencari-cari
   * penyebabnya di daftar yang isinya justru sudah benar.
   */
  const ubah = (tingkat: Tingkat, dipilih: string[]) => {
    const next: FilterState = { ...value, [tingkat]: dipilih };
    for (const lain of ['wilayah', 'region', 'depot'] as Tingkat[]) {
      if (lain === tingkat || next[lain].length === 0) continue;
      const sah = new Set(
        simpul
          .filter((s) =>
            cocok(
              s,
              lain === 'wilayah' ? [] : next.wilayah,
              lain === 'region' ? [] : next.region,
              lain === 'depot' ? [] : next.depot,
            ),
          )
          .map((s) => s[lain]),
      );
      next[lain] = next[lain].filter((v) => sah.has(v));
    }
    onChange(next);
  };

  const aktif = adaFilterAktif(value);

  // Margin bawah dipegang komponen ini sendiri, dan itu memang cukup: di
  // Tailwind v4 `space-y-*` juga memakai margin-bottom dan dibungkus `:where()`
  // yang spesifisitasnya nol, jadi keduanya saling menimpa dengan nilai yang
  // sama - tidak pernah menjumlah. Menimpanya dengan mb-0 dari luar justru
  // menghapus jaraknya sama sekali.
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-3 shadow-xs sm:mb-6 sm:p-4">
      {/* Satu baris di laptop: pencarian mengisi sisa ruang dan boleh menyempit,
          jadi filter tambahan atau tombol Reset tidak pernah memindah baris. */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        {withSearch && (
          <div className="relative min-w-0 lg:flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={value.q}
              onChange={(e) => onChange({ ...value, q: e.target.value })}
              placeholder={searchPlaceholder}
              aria-label="Cari toko"
              autoComplete="off"
              className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
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

        <div className="flex flex-wrap gap-2.5 lg:flex-nowrap">
          {awal}
          {!filterToko && (
            <PilihBanyak
              items={regionTampil}
              value={value.region}
              onChange={(v) => ubah('region', v)}
              labelSemua="Region"
              satuan="Region"
              format={(r) => `Region ${r}`}
              cariPlaceholder="Cari region..."
              kosong="Region tidak ditemukan."
              className="min-w-0 flex-1 sm:w-36 sm:flex-none"
            />
          )}

          <PilihBanyak
            items={depotTampil}
            value={value.depot}
            onChange={(v) => ubah('depot', v)}
            labelSemua="Depot"
            satuan="Depot"
            cariPlaceholder="Cari depot..."
            kosong="Depot tidak ditemukan."
            className="min-w-0 flex-1 sm:w-40 sm:flex-none"
          />

          {filterToko && (
            // Di HP keduanya berbagi satu baris sendiri di bawah Depot + Reset,
            // supaya label tidak terpotong dan Reset tidak menambah baris.
            // Mulai sm pembungkus ini lenyap (contents) dan keduanya ikut baris utama.
            <div className="order-last flex basis-full gap-2.5 sm:contents">
              <PilihBanyak
                items={HADIR}
                value={value.hadir}
                onChange={(v) => onChange({ ...value, hadir: v })}
                labelSemua="Kehadiran"
                satuan="Status"
                cariPlaceholder="Cari status..."
                kosong="Status tidak ditemukan."
                className="min-w-0 flex-[2] sm:w-36 sm:flex-none"
              />
              <PilihBanyak
                items={TAMBAH}
                value={value.tambah}
                onChange={(v) => onChange({ ...value, tambah: v })}
                labelSemua="Penambahan"
                satuan="Status"
                cariPlaceholder="Cari status..."
                kosong="Status tidak ditemukan."
                className="min-w-0 flex-[3] sm:w-44 sm:flex-none"
              />
            </div>
          )}

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
