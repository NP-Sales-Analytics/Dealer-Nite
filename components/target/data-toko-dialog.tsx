'use client';

import { Search, X } from 'lucide-react';
import { useState } from 'react';
import type { TargetRow } from './types';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cocokCari } from '@/lib/cari';

function Bagian({ judul, aksi, children }: { judul: string; aksi?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[0.8125rem] font-bold uppercase tracking-wide">{judul}</h3>
        {aksi}
      </div>
      {children}
    </section>
  );
}

function Isi({ label, nilai }: { label: string; nilai: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-border px-3.5 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm font-medium">{nilai || '—'}</p>
    </div>
  );
}

/** Detail data toko saja (tanpa target/omset), termasuk daftar lengkap Sold To Party. */
export function DataTokoDialog({ row, onOpenChange }: { row: TargetRow; onOpenChange: (value: boolean) => void }) {
  const [cari, setCari] = useState('');
  const sotp = row.sotp.map((item, index) => ({ ...item, nomor: index + 1 }));
  const tampil = sotp.filter((item) => cocokCari(cari, [item.kode, item.nama]));

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[90svh] w-[calc(100vw-1.5rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <InitialAvatar nama={row.mgName} className="size-10 rounded-xl" />
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold break-words">Detail Data Toko</DialogTitle>
              <DialogDescription className="text-xs">{row.mgName}</DialogDescription>
            </div>
          </div>
          <DialogClose
            aria-label="Tutup"
            className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          <Bagian judul="Lokasi">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <Isi label="Depot" nilai={row.depotName} />
              <Isi label="Wilayah" nilai={row.wilayah} />
              <Isi label="Region" nilai={row.region ? `Region ${row.region}` : null} />
            </div>
          </Bagian>

          <Bagian judul="Master Group">
            <div className="grid grid-cols-[3fr_7fr] gap-2.5">
              <Isi label="Kode Toko" nilai={<span className="tabular-nums">{row.mgCode}</span>} />
              <Isi label="Nama Toko" nilai={row.mgName} />
            </div>
          </Bagian>

          <Bagian judul="Tim Sales">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Isi label="Salesman" nilai={row.salesman} />
              <Isi label="SPV" nilai={row.spv} />
            </div>
          </Bagian>

          <Bagian judul="Pendaftaran">
            <div className="grid grid-cols-2 gap-2.5">
              <Isi label="Pax terdaftar" nilai={row.paxTerdaftar == null ? null : `${row.paxTerdaftar} orang`} />
              <Isi label="No Undian" nilai={row.undianMaster && <span className="tabular-nums">{row.undianMaster}</span>} />
            </div>
          </Bagian>

          <Bagian
            judul={`Sold To Party (${sotp.length})`}
            aksi={sotp.length > 8 && (
              <label className="relative block w-44 sm:w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={cari}
                  onChange={(event) => setCari(event.target.value)}
                  placeholder="Cari kode atau nama SOTP..."
                  aria-label="Cari Sold To Party"
                  className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                />
              </label>
            )}
          >
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="grid grid-cols-[2.5rem_3fr_7fr] gap-3 border-b border-border bg-secondary/40 px-3.5 py-2 text-xs font-medium text-muted-foreground">
                <span>No</span>
                <span>Kode SOTP</span>
                <span>Nama Sold To Party</span>
              </div>
              <ol className="divide-y divide-border">
                {tampil.map((item) => (
                  <li key={item.kode} className="grid grid-cols-[2.5rem_3fr_7fr] gap-3 px-3.5 py-2.5 text-sm">
                    <span className="tabular-nums text-muted-foreground">{item.nomor}</span>
                    <span className="tabular-nums">{item.kode}</span>
                    <span className="break-words font-medium">
                      {item.nama}
                      {item.nomor === 1 && sotp.length > 1 && (
                        <span className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-primary">Utama</span>
                      )}
                    </span>
                  </li>
                ))}
                {tampil.length === 0 && (
                  <li className="px-3.5 py-6 text-center text-sm text-muted-foreground">Tidak ada SOTP yang cocok.</li>
                )}
              </ol>
            </div>
          </Bagian>
        </div>
      </DialogContent>
    </Dialog>
  );
}
