'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Building2, CalendarClock, MapPin, Store, UserCheck, UserRound, Users, X } from 'lucide-react';
import { NoFormulirRow } from './no-formulir-row';
import { PillHadir, PillStatus } from './pills';
import { TargetFormPanel } from './target-form-panel';
import type { TargetRow } from './types';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatRupiah } from '@/lib/target/money';
import { cn, jamJakarta, tanggalJakarta } from '@/lib/utils';

type Riwayat = {
  id: string; delta: number; jenis: 'verifikasi' | 'penyesuaian'; noFormulir: number | null; note: string | null;
  recordedByName: string | null; createdAt: string;
};

const waktu = (iso: string) => `${tanggalJakarta(iso)}, ${jamJakarta(iso)}`;

function Judul({ children, icon: Icon }: { children: React.ReactNode; icon?: typeof Store }) {
  return (
    <h3 className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </h3>
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
      {nilai > 0 ? '+' : ''}{formatRupiah(nilai)}
    </span>
  );
}

/** Satu tahap perjalanan target; nilai selalu rupiah penuh supaya tidak ambigu. */
function Tahap({ nomor, label, nilai, selisih, aktif, kosong }: {
  nomor: number; label: string; nilai: number | null; selisih?: number; aktif?: boolean; kosong: string;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border px-3.5 py-3',
        nilai === null ? 'border-dashed border-border'
          : aktif ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/15' : 'border-border bg-card',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'grid size-5 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold',
            nilai === null ? 'bg-secondary text-muted-foreground' : aktif ? 'bg-primary text-primary-foreground' : 'bg-foreground/80 text-background',
          )}
        >
          {nomor}
        </span>
        <span className="truncate text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      {nilai === null ? (
        <p className="text-sm text-muted-foreground">{kosong}</p>
      ) : (
        <>
          <p className="text-lg font-bold tracking-tight tabular-nums">{formatRupiah(nilai)}</p>
          <div className="min-h-5">{selisih !== undefined && <Selisih nilai={selisih} />}</div>
        </>
      )}
    </div>
  );
}

function Baris({ icon: Icon, label, nilai }: { icon: typeof Store; label: string; nilai: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1rem_5.25rem_minmax(0,1fr)] items-start gap-2.5 py-2 text-[0.8125rem] leading-snug">
      <Icon className="mt-px size-3.5 text-muted-foreground" aria-hidden />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{nilai || '—'}</span>
    </div>
  );
}

export function TargetDetailDialog({
  row, canAdjust, minTarget, onOpenChange, onSaved, onTargetSaved,
}: {
  row: TargetRow;
  /** Target minimal DN toko ini. */
  minTarget: number;
  canAdjust: boolean;
  onOpenChange: (value: boolean) => void;
  onSaved: () => void;
  /** Verifikasi/penyesuaian tersimpan dengan nomor formulir ini. */
  onTargetSaved: (noFormulir: number) => void;
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
  const terbaru = [...timeline].reverse();
  const penyesuaian = row.targetEfektif - (row.targetVerifikasi ?? row.targetEfektif);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[94svh] w-[calc(100vw-1.5rem)] max-w-6xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-6xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <InitialAvatar nama={row.mgName} className="size-10 rounded-xl" />
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold break-words sm:truncate">{row.mgName}</DialogTitle>
              <DialogDescription className="text-xs">MG {row.mgCode} · {row.depotName}</DialogDescription>
              {/* Di HP pill pindah ke bawah nama supaya nama toko tidak terpotong. */}
              <span className="mt-1.5 flex sm:hidden"><PillStatus verified={verified} /></span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden sm:flex"><PillStatus verified={verified} /></span>
            <DialogClose
              aria-label="Tutup"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-4" />
            </DialogClose>
          </div>
        </header>

        <div className={cn('flex min-h-0 flex-col overflow-y-auto', canAdjust && 'lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:overflow-hidden')}>
          <div className="order-2 space-y-4 px-5 py-4 sm:px-6 lg:order-none lg:overflow-y-auto">
            <section className="space-y-2.5">
              <Judul>Perjalanan Target DN</Judul>
              <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
                <Tahap nomor={1} label="Target Pusat" nilai={row.targetAwal} kosong="" />
                <ArrowRight className="hidden size-4 shrink-0 self-center text-muted-foreground md:block" aria-hidden />
                <Tahap
                  nomor={2}
                  label="Verifikasi Admin DN"
                  nilai={verified ? row.targetVerifikasi ?? row.targetAwal : null}
                  selisih={verified ? (row.targetVerifikasi ?? row.targetAwal) - row.targetAwal : undefined}
                  kosong="Menunggu verifikasi"
                  aktif={verified && penyesuaian === 0}
                />
                <ArrowRight className="hidden size-4 shrink-0 self-center text-muted-foreground md:block" aria-hidden />
                <Tahap
                  nomor={3}
                  label="Target Saat Ini"
                  nilai={verified ? row.targetEfektif : null}
                  selisih={verified ? penyesuaian : undefined}
                  kosong="Muncul setelah verifikasi"
                  aktif={verified && penyesuaian !== 0}
                />
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="space-y-2.5">
                <Judul icon={Store}>Data Toko</Judul>
                <div className="rounded-xl border border-border px-3.5 py-2">
                  <div className="divide-y divide-border">
                    <NoFormulirRow customerId={row.customerId} riwayat={terbaru} canEdit={canAdjust} onSaved={onSaved} />
                    <Baris icon={Building2} label="SOTP" nilai={`${row.sotpName} · ${row.sotpCode}`} />
                    <Baris icon={MapPin} label="Region" nilai={row.region ? `Region ${row.region}` : null} />
                    <Baris icon={UserRound} label="Salesman" nilai={row.salesman} />
                    <Baris icon={UserCheck} label="SPV" nilai={row.spv} />
                    <Baris
                      icon={Users}
                      label="Kehadiran"
                      nilai={(
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <PillHadir qtyHadir={row.qtyHadir} />
                          {row.qtyHadir !== null && (
                            <span className="text-xs text-muted-foreground">
                              {row.qtyHadir} pax · undian <span className="font-semibold text-foreground">{row.nomorUndian ?? '—'}</span>
                              {row.checkedInAt && <> · {jamJakarta(row.checkedInAt)}</>}
                            </span>
                          )}
                        </span>
                      )}
                    />
                  </div>
                </div>
              </section>

              <section className="flex min-h-0 flex-col space-y-2.5">
                <Judul icon={CalendarClock}>Riwayat Target</Judul>
                <div className="max-h-64 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border px-3.5 py-3">
                  {history.isLoading ? (
                    <p className="text-sm text-muted-foreground">Memuat riwayat...</p>
                  ) : (
                    <ol className="relative space-y-3 border-l border-border pl-4">
                      {!verified && (
                        <li className="relative">
                          <span className="absolute -left-[1.3125rem] top-1 size-2.5 rounded-full border-2 border-dashed border-amber-400 bg-background" aria-hidden />
                          <p className="text-sm text-muted-foreground">Menunggu verifikasi admin DN</p>
                        </li>
                      )}
                      {terbaru.map((item) => (
                        <li key={item.id} className="relative">
                          <span
                            className={cn('absolute -left-[1.3125rem] top-1 size-2.5 rounded-full border-2 border-background', item.jenis === 'verifikasi' ? 'bg-emerald-500' : 'bg-primary')}
                            aria-hidden
                          />
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn(
                              'rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold',
                              item.jenis === 'verifikasi' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-primary/10 text-primary',
                            )}
                            >
                              {item.jenis === 'verifikasi' ? 'Verifikasi' : 'Penyesuaian'}{' '}
                              {item.noFormulir != null ? `Form ${item.noFormulir}` : '· Form belum diisi'}
                            </span>
                            <Selisih nilai={item.delta} />
                          </div>
                          <p className="mt-1 text-xs tabular-nums">
                            <span className="text-muted-foreground">{formatRupiah(item.sebelum)}</span>
                            <ArrowRight className="mx-1 inline size-3 text-muted-foreground" aria-hidden />
                            <span className="font-semibold">{formatRupiah(item.sesudah)}</span>
                          </p>
                          <p className="text-[0.6875rem] text-muted-foreground">{item.recordedByName ?? 'Akun lama'} · {waktu(item.createdAt)}</p>
                        </li>
                      ))}
                      <li className="relative">
                        <span className="absolute -left-[1.3125rem] top-1 size-2.5 rounded-full border-2 border-background bg-muted-foreground" aria-hidden />
                        <p className="text-xs text-muted-foreground">Target dari pusat</p>
                        <p className="text-xs font-semibold tabular-nums">{formatRupiah(row.targetAwal)}</p>
                      </li>
                    </ol>
                  )}
                </div>
              </section>
            </div>
          </div>

          {/* Kanan: langsung ke verifikasi (belum) atau penyesuaian (sudah) */}
          {canAdjust && (
            <aside className="order-1 border-b border-border bg-secondary/25 px-5 py-4 sm:px-6 lg:order-none lg:overflow-y-auto lg:border-b-0 lg:border-l">
              <TargetFormPanel key={`${row.verifiedAt}-${row.targetEfektif}`} row={row} minTarget={minTarget} onSaved={onTargetSaved} />
            </aside>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
