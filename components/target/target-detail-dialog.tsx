'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, BadgeCheck, Building2, CalendarClock, Hash, Pencil, SlidersHorizontal, Trash2, UserRound, Users, X,
} from 'lucide-react';
import { PillHadir, PillStatus } from './pills';
import type { TargetRow } from './types';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatRupiah, formatRupiahRingkas } from '@/lib/target/money';
import { cn, jamJakarta, tanggalJakarta } from '@/lib/utils';

type Riwayat = {
  id: string; delta: number; jenis: 'verifikasi' | 'penyesuaian'; note: string | null;
  recordedByName: string | null; createdAt: string;
};

const waktu = (iso: string) => `${tanggalJakarta(iso)}, ${jamJakarta(iso)}`;

function Judul({ children, icon: Icon }: { children: React.ReactNode; icon?: typeof Users }) {
  return (
    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </h3>
  );
}

function Info({ icon: Icon, label, nilai }: { icon: typeof Hash; label: string; nilai: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium">{nilai || '—'}</p>
      </div>
    </div>
  );
}

function Selisih({ nilai }: { nilai: number }) {
  if (nilai === 0) return <span className="text-xs text-muted-foreground">Tidak berubah</span>;
  return (
    <span className={cn(
      'inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums',
      nilai > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    )}
    >
      {nilai > 0 ? '+' : ''}{formatRupiahRingkas(nilai)}
    </span>
  );
}

/** Satu tahap pada perjalanan target: pusat -> verifikasi -> saat ini. */
function Tahap({ nomor, label, nilai, selisih, meta, aktif, kosong }: {
  nomor: number; label: string; nilai: number | null; selisih?: number; meta?: string; aktif?: boolean; kosong?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-1 flex-col rounded-xl border p-3.5 transition-colors',
        nilai === null ? 'border-dashed border-border bg-transparent'
          : aktif ? 'border-primary/40 bg-primary/5 shadow-xs ring-1 ring-primary/15' : 'border-border bg-card',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold',
            nilai === null ? 'bg-secondary text-muted-foreground' : aktif ? 'bg-primary text-primary-foreground' : 'bg-foreground/80 text-background',
          )}
        >
          {nomor}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      {nilai === null ? (
        <p className="mt-3 text-sm text-muted-foreground">{kosong}</p>
      ) : (
        <>
          <p className="mt-2 text-xl font-bold tracking-tight tabular-nums">{formatRupiahRingkas(nilai)}</p>
          <p className="text-[11px] tabular-nums text-muted-foreground">{formatRupiah(nilai)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {selisih !== undefined && <Selisih nilai={selisih} />}
          </div>
          {meta && <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{meta}</p>}
        </>
      )}
    </div>
  );
}

export function TargetDetailDialog({
  row, canAdjust, canManage, onOpenChange, onAdjust, onEdit, onHapus,
}: {
  row: TargetRow;
  canAdjust: boolean;
  canManage: boolean;
  onOpenChange: (value: boolean) => void;
  onAdjust: (row: TargetRow) => void;
  onEdit: (row: TargetRow) => void;
  onHapus: (row: TargetRow) => void;
}) {
  const verified = !!row.verifiedAt;
  const history = useQuery({
    queryKey: ['targets', 'history', row.customerId],
    queryFn: async (): Promise<{ history: Riwayat[] }> => {
      const response = await fetch(`/api/targets/history?customerId=${encodeURIComponent(row.customerId)}`);
      if (!response.ok) throw new Error('Gagal memuat riwayat.');
      return response.json();
    },
  });

  // Timeline urut waktu dengan nilai sebelum -> sesudah tiap perubahan.
  const urut = [...(history.data?.history ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  let berjalan = row.targetAwal;
  const timeline = urut.map((item) => {
    const sebelum = berjalan;
    berjalan += item.delta;
    return { ...item, sebelum, sesudah: berjalan };
  });
  if (verified && !urut.some((item) => item.jenis === 'verifikasi')) {
    const index = timeline.findIndex((item) => item.createdAt > row.verifiedAt!);
    const nilai = row.targetVerifikasi ?? row.targetAwal;
    timeline.splice(index < 0 ? timeline.length : index, 0, {
      id: 'verifikasi', delta: 0, jenis: 'verifikasi', note: null, recordedByName: row.verifiedByName,
      createdAt: row.verifiedAt!, sebelum: nilai, sesudah: nilai,
    });
  }
  const penyesuaian = row.targetEfektif - (row.targetVerifikasi ?? row.targetEfektif);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[92svh] w-[calc(100vw-1.5rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-5xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <InitialAvatar nama={row.mgName} className="size-11 rounded-xl" />
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-semibold sm:text-lg">{row.mgName}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="tabular-nums">MG {row.mgCode}</span>
                <span aria-hidden>·</span>
                <span>{row.depotName}</span>
              </DialogDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden sm:inline-flex"><PillStatus verified={verified} /></span>
            <DialogClose
              aria-label="Tutup"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-4" />
            </DialogClose>
          </div>
        </header>

        <div className="flex min-h-0 flex-col overflow-y-auto lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:overflow-hidden">
          {/* Kolom kiri: identitas & konteks toko */}
          <aside className="order-2 space-y-5 border-t border-border bg-secondary/25 px-5 py-5 sm:px-6 lg:order-none lg:overflow-y-auto lg:border-r lg:border-t-0">
            <div className="flex flex-wrap gap-1.5 sm:hidden"><PillStatus verified={verified} /></div>
            <section className="space-y-1">
              <Judul>Data Toko</Judul>
              <div className="divide-y divide-border">
                <Info icon={Building2} label="SOTP" nilai={`${row.sotpName} · ${row.sotpCode}`} />
                <Info icon={Hash} label="Wilayah / Region" nilai={`${row.wilayah ?? '-'} / ${row.region ?? '-'}`} />
                <Info icon={UserRound} label="Salesman" nilai={row.salesman} />
                <Info icon={UserRound} label="SPV" nilai={row.spv} />
              </div>
            </section>
            <section className="space-y-2">
              <Judul icon={Users}>Kehadiran</Judul>
              <div className="rounded-xl border border-border bg-card p-3.5">
                <PillHadir qtyHadir={row.qtyHadir} />
                {row.qtyHadir !== null && (
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-[11px] text-muted-foreground">Pax hadir</dt><dd className="font-semibold tabular-nums">{row.qtyHadir}</dd></div>
                    <div><dt className="text-[11px] text-muted-foreground">Nomor undian</dt><dd className="font-semibold tabular-nums">{row.nomorUndian ?? '—'}</dd></div>
                    <div className="col-span-2"><dt className="text-[11px] text-muted-foreground">Check-in</dt><dd className="font-medium">{row.checkedInAt ? waktu(row.checkedInAt) : '—'}</dd></div>
                  </dl>
                )}
              </div>
            </section>
          </aside>

          {/* Kolom kanan: perjalanan target, kupon, riwayat */}
          <div className="space-y-6 px-5 py-5 sm:px-6 lg:overflow-y-auto">
            <section className="space-y-3">
              <Judul>Perjalanan Target DN</Judul>
              <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
                <Tahap nomor={1} label="Target Pusat" nilai={row.targetAwal} meta="Data dari tim pusat" />
                <ArrowRight className="hidden size-4 shrink-0 self-center text-muted-foreground md:block" aria-hidden />
                <Tahap
                  nomor={2}
                  label="Verifikasi Admin DN"
                  nilai={verified ? row.targetVerifikasi ?? row.targetAwal : null}
                  selisih={verified ? (row.targetVerifikasi ?? row.targetAwal) - row.targetAwal : undefined}
                  meta={verified ? `${row.verifiedByName ?? 'Akun lama'} · ${waktu(row.verifiedAt!)}` : undefined}
                  kosong="Menunggu verifikasi"
                  aktif={verified && penyesuaian === 0}
                />
                <ArrowRight className="hidden size-4 shrink-0 self-center text-muted-foreground md:block" aria-hidden />
                <Tahap
                  nomor={3}
                  label="Target Saat Ini"
                  nilai={verified ? row.targetEfektif : null}
                  selisih={verified ? penyesuaian : undefined}
                  meta={verified ? (penyesuaian === 0 ? 'Belum ada penyesuaian' : 'Penyesuaian setelah verifikasi') : undefined}
                  kosong="Muncul setelah verifikasi"
                  aktif={verified && penyesuaian !== 0}
                />
              </div>
            </section>

            <section className="space-y-3">
              <Judul icon={CalendarClock}>Riwayat Target</Judul>
              {history.isLoading ? (
                <p className="text-sm text-muted-foreground">Memuat riwayat...</p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-5">
                  <li className="relative">
                    <span className="absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-background bg-muted-foreground" aria-hidden />
                    <p className="text-sm font-medium">Target dari pusat</p>
                    <p className="text-sm font-semibold tabular-nums">{formatRupiah(row.targetAwal)}</p>
                  </li>
                  {timeline.map((item) => (
                    <li key={item.id} className="relative">
                      <span
                        className={cn(
                          'absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-background',
                          item.jenis === 'verifikasi' ? 'bg-emerald-500' : 'bg-primary',
                        )}
                        aria-hidden
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          'rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                          item.jenis === 'verifikasi' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-primary/10 text-primary',
                        )}
                        >
                          {item.jenis === 'verifikasi' ? 'Verifikasi' : 'Penyesuaian'}
                        </span>
                        <Selisih nilai={item.delta} />
                      </div>
                      <p className="mt-1 text-sm tabular-nums">
                        <span className="text-muted-foreground">{formatRupiah(item.sebelum)}</span>
                        <ArrowRight className="mx-1.5 inline size-3.5 text-muted-foreground" aria-hidden />
                        <span className="font-semibold">{formatRupiah(item.sesudah)}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.recordedByName ?? 'Akun lama'} · {waktu(item.createdAt)}
                      </p>
                      {item.note && <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{item.note}&rdquo;</p>}
                    </li>
                  ))}
                  {!verified && (
                    <li className="relative">
                      <span className="absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-dashed border-amber-400 bg-background" aria-hidden />
                      <p className="text-sm text-muted-foreground">Menunggu verifikasi admin DN</p>
                    </li>
                  )}
                </ol>
              )}
            </section>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:px-6">
          {canManage && (
            <Button
              variant="ghost"
              className="h-11 gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
              onClick={() => onHapus(row)}
            >
              <Trash2 className="size-4" />
              Hapus Toko
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            {canManage && (
              <Button variant="outline" className="h-11 flex-1 gap-2 sm:flex-none" onClick={() => onEdit(row)}>
                <Pencil className="size-4" />
                Edit Data
              </Button>
            )}
            {canAdjust ? (
              <Button className="h-11 flex-[2] gap-2 sm:flex-none sm:px-6" onClick={() => onAdjust(row)}>
                {verified ? <SlidersHorizontal className="size-4" /> : <BadgeCheck className="size-4" />}
                {verified ? 'Sesuaikan Target' : 'Verifikasi Target'}
              </Button>
            ) : !canManage && (
              <Button variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>Tutup</Button>
            )}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
