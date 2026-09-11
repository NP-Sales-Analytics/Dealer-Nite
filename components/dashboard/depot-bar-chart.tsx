'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { DepotRow } from '@/lib/dashboard/compute';

const PER_PAGE = 10;

/**
 * Sebaran per depot. Bukan chart recharts melainkan baris progress bar:
 * 35+ depot dengan nama panjang tidak terbaca sebagai batang sumbu-kategori di
 * layar HP, sedangkan baris bernomor tetap terbaca di lebar berapa pun dan
 * angkanya bisa ditulis apa adanya.
 */
export function DepotBarChart({ rows }: { rows: DepotRow[] }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const aman = Math.min(page, totalPages);
  const mulai = (aman - 1) * PER_PAGE;
  const tampil = rows.slice(mulai, mulai + PER_PAGE);
  // Bar diskalakan ke jumlah TOKO hadir tertinggi, sehingga urutan visual dan
  // urutan daftar tetap sama seperti tampilan awal.
  const maksHadir = Math.max(1, ...rows.map((r) => r.tokoHadir));
  return (
    <div className="rounded-2xl border border-border bg-card shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="font-semibold">Sebaran per Depot</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Berapa toko yang sudah datang dari yang diundang tiap depot
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
          {rows.length} depot
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground sm:p-5">Belum ada data depot.</p>
      ) : (
        <>
          <ol className="space-y-4 p-4 sm:p-5">
            {tampil.map((r, i) => {
              const peringkat = mulai + i + 1;
              const lebarHadir = Math.min(100, (r.tokoHadir / maksHadir) * 100);

              return (
                <li key={r.depot}>
                  {/* Di HP angka turun ke baris kedua: berebut ruang dengan nama
                      depot membuat namanya terpotong di 375px. */}
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={
                          peringkat === 1
                            ? 'grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground'
                            : 'grid size-6 shrink-0 place-items-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground'
                        }
                      >
                        {peringkat}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {r.depot}
                        {r.region && (
                          <span className="ml-1 font-normal text-muted-foreground">
                            (Region {r.region})
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="shrink-0 pl-[2.1rem] text-xs tabular-nums text-muted-foreground sm:ml-auto sm:pl-0">
                      <span className="font-semibold text-foreground">{r.tokoDiundang}</span> toko diundang
                      {' · '}
                      <span className="font-semibold text-foreground">{r.tokoHadir}</span> hadir
                      <span className="ml-1 text-muted-foreground">({r.qtyHadir} pax)</span>
                    </span>
                  </div>

                  {/* Panjang bar = kehadiran depot ini dibanding depot dengan
                      kehadiran tertinggi, sehingga urutan visual = urutan daftar. */}
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${lebarHadir}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3 sm:px-5">
            <p className="text-xs text-muted-foreground">
              Menampilkan {mulai + 1}–{Math.min(mulai + PER_PAGE, rows.length)} dari {rows.length} depot
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={aman <= 1}
                aria-label="Halaman sebelumnya"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="px-2 text-xs tabular-nums text-muted-foreground">
                {aman}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={aman >= totalPages}
                aria-label="Halaman berikutnya"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
