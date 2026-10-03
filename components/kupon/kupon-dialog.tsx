'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, PackageCheck, Printer, Undo2, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { BarProses, PillStatusKupon, WARNA } from './status';
import { QtyStepper } from '@/components/reservation/qty-stepper';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { PillHadir } from '@/components/target/pills';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { KuponRow, TahapKupon } from '@/lib/kupon/service';
import { prosesKupon, totalKupon } from '@/lib/target/kupon';
import { formatRupiahRingkas } from '@/lib/target/money';
import { cn, jamJakarta, tanggalJakarta } from '@/lib/utils';

type Riwayat = {
  id: string; tahap: TahapKupon; pink: number; hijau: number; penerima: string | null;
  catatan: string | null; recordedByName: string | null; createdAt: string;
};

const waktu = (iso: string) => `${tanggalJakarta(iso)}, ${jamJakarta(iso)}`;

function Judul({ children, icon: Icon }: { children: React.ReactNode; icon?: typeof Printer }) {
  return (
    <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {children}
    </h3>
  );
}

export function KuponDialog({ row, canManage, onOpenChange, onChanged }: {
  row: KuponRow;
  canManage: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const k = prosesKupon({ verified: row.verified, target: row.targetEfektif, dibuat: row.dibuat, diberikan: row.diberikan });
  const tahapAwal: TahapKupon = totalKupon(k.perluDibuat) > 0 || totalKupon(k.siapDiberikan) === 0 ? 'dibuat' : 'diberikan';
  const [tahap, setTahap] = useState<TahapKupon>(tahapAwal);
  const batas = tahap === 'dibuat' ? k.perluDibuat : k.siapDiberikan;
  const [pink, setPink] = useState(String(batas.pink));
  const [hijau, setHijau] = useState(String(batas.hijau));
  const [pending, start] = useTransition();

  const history = useQuery({
    queryKey: ['kupon', 'riwayat', row.customerId],
    queryFn: async (): Promise<{ history: Riwayat[] }> => {
      const response = await fetch(`/api/kupon/riwayat?customerId=${encodeURIComponent(row.customerId)}`);
      if (!response.ok) throw new Error('Gagal memuat riwayat kupon.');
      return response.json();
    },
  });

  const gantiTahap = (baru: TahapKupon) => {
    const b = baru === 'dibuat' ? k.perluDibuat : k.siapDiberikan;
    setTahap(baru);
    setPink(String(b.pink));
    setHijau(String(b.hijau));
  };

  const jumlah = { pink: Number(pink) || 0, hijau: Number(hijau) || 0 };
  const valid = jumlah.pink + jumlah.hijau > 0 && jumlah.pink <= batas.pink && jumlah.hijau <= batas.hijau;

  const simpan = () => start(async () => {
    const response = await fetch('/api/kupon', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerId: row.customerId, tahap, ...jumlah }),
    }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      toast.error(body?.error ?? 'Gagal mencatat kupon.');
      return;
    }
    toast.success(`${jumlah.pink} pink & ${jumlah.hijau} hijau ${tahap === 'dibuat' ? 'tercatat dibuat' : 'tercatat diberikan'}.`);
    onChanged();
  });

  const batalkan = (id: string) => start(async () => {
    const response = await fetch(`/api/kupon/${id}`, { method: 'DELETE' }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      toast.error(body?.error ?? 'Gagal membatalkan catatan.');
      return;
    }
    toast.success('Catatan kupon dibatalkan.');
    onChanged();
  });

  const riwayat = history.data?.history ?? [];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[92svh] w-[calc(100vw-1.5rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-5xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <InitialAvatar nama={row.mgName} className="size-11 rounded-xl" />
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-semibold sm:text-lg">{row.mgName}</DialogTitle>
              <DialogDescription className="text-xs">
                MG {row.mgCode} · {row.depotName} · Target {formatRupiahRingkas(row.targetEfektif)}
              </DialogDescription>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden sm:inline-flex"><PillStatusKupon status={k.status} /></span>
            <DialogClose aria-label="Tutup" className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
              <X className="size-4" />
            </DialogClose>
          </div>
        </header>

        <div className="min-h-0 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:overflow-hidden">
          <div className="space-y-6 px-5 py-5 sm:px-6 lg:overflow-y-auto">
            <div className="sm:hidden"><PillStatusKupon status={k.status} /></div>
            <section className="space-y-3">
              <Judul>Posisi Kupon</Judul>
              {k.status === 'belum_verifikasi' ? (
                <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                  Target toko ini belum diverifikasi admin DN, jadi hak kuponnya belum ada.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(['pink', 'hijau'] as const).map((warna) => (
                    <div key={warna} className="rounded-xl border border-border p-4">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold">
                          <span className={cn('size-2.5 rounded-full', WARNA[warna].dot)} aria-hidden />
                          Kupon {WARNA[warna].label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">per {WARNA[warna].nilai}</span>
                      </div>
                      <p className="mt-2 text-3xl font-bold tabular-nums">{k.hak[warna]}<span className="ml-1 text-sm font-medium text-muted-foreground">hak</span></p>
                      <div className="mt-3"><BarProses warna={warna} hak={k.hak[warna]} dibuat={k.dibuat[warna]} diberikan={k.diberikan[warna]} /></div>
                      <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div><dt className="text-muted-foreground">Dibuat</dt><dd className="text-sm font-semibold tabular-nums">{k.dibuat[warna]}</dd></div>
                        <div><dt className="text-muted-foreground">Diberikan</dt><dd className="text-sm font-semibold tabular-nums">{k.diberikan[warna]}</dd></div>
                        <div>
                          <dt className="text-muted-foreground">Perlu dibuat</dt>
                          <dd className={cn('text-sm font-semibold tabular-nums', k.perluDibuat[warna] > 0 && 'text-sky-600')}>{k.perluDibuat[warna]}</dd>
                        </div>
                      </dl>
                      {k.kelebihan[warna] > 0 && (
                        <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                          Kelebihan {k.kelebihan[warna]} karena target turun setelah kupon dibuat.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <Judul>Kehadiran</Judul>
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                <PillHadir qtyHadir={row.qtyHadir} />
                {row.qtyHadir !== null && (
                  <>
                    <span className="text-muted-foreground">{row.qtyHadir} pax</span>
                    <span className="text-muted-foreground">·</span>
                    <span>No. undian <span className="font-semibold tabular-nums">{row.nomorUndian ?? '—'}</span></span>
                    {row.checkedInAt && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="tabular-nums text-muted-foreground">{jamJakarta(row.checkedInAt)}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <Judul icon={CalendarClock}>Riwayat Proses Kupon</Judul>
              {history.isLoading ? (
                <p className="text-sm text-muted-foreground">Memuat riwayat...</p>
              ) : riwayat.length === 0 ? (
                <p className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">Belum ada kupon yang dibuat atau diberikan.</p>
              ) : (
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {riwayat.map((item) => (
                    <li key={item.id} className="relative">
                      <span
                        className={cn('absolute -left-[25px] top-1 size-2.5 rounded-full border-2 border-background', item.tahap === 'dibuat' ? 'bg-sky-500' : 'bg-violet-500')}
                        aria-hidden
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                          'rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                          item.tahap === 'dibuat' ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' : 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
                        )}
                        >
                          {item.tahap === 'dibuat' ? 'Dibuat' : 'Diberikan'}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          <span className={WARNA.pink.teks}>{item.pink} pink</span>
                          <span className="mx-1 text-muted-foreground">·</span>
                          <span className={WARNA.hijau.teks}>{item.hijau} hijau</span>
                        </span>
                        {canManage && (
                          <button
                            type="button"
                            onClick={() => batalkan(item.id)}
                            disabled={pending}
                            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          >
                            <Undo2 className="size-3.5" aria-hidden />
                            Batalkan
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.recordedByName ?? 'Akun lama'} · {waktu(item.createdAt)}
                        {item.penerima && <> · diterima <span className="font-medium text-foreground">{item.penerima}</span></>}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <aside className="border-t border-border bg-secondary/25 px-5 py-5 sm:px-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
            {!canManage ? (
              <p className="text-sm text-muted-foreground">Akun ini hanya bisa melihat data kupon.</p>
            ) : k.status === 'belum_verifikasi' ? (
              <p className="text-sm text-muted-foreground">Proses kupon dibuka setelah target diverifikasi.</p>
            ) : k.status === 'selesai' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                <p className="font-semibold">Semua kupon sudah diberikan.</p>
                <p className="mt-1 text-xs">Kalau target toko naik, kupon tambahannya otomatis muncul sebagai &ldquo;perlu dibuat&rdquo;.</p>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); if (valid) simpan(); }}>
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-card p-1" role="tablist">
                  {([['dibuat', 'Catat Pembuatan', Printer, k.perluDibuat], ['diberikan', 'Catat Pemberian', PackageCheck, k.siapDiberikan]] as const).map(([key, label, Icon, sisa]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={tahap === key}
                      disabled={totalKupon(sisa) === 0}
                      onClick={() => gantiTahap(key)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors disabled:opacity-40',
                        tahap === key ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-secondary',
                      )}
                    >
                      <Icon className="size-3.5" aria-hidden />
                      {label}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  {tahap === 'dibuat'
                    ? `Sisa yang perlu dibuat: ${k.perluDibuat.pink} pink, ${k.perluDibuat.hijau} hijau.`
                    : `Sudah dibuat dan siap diberikan: ${k.siapDiberikan.pink} pink, ${k.siapDiberikan.hijau} hijau.`}
                </p>

                {(['pink', 'hijau'] as const).map((warna) => (
                  <div key={warna} className="space-y-2">
                    <Label htmlFor={`k-${warna}`} className="flex items-center gap-2">
                      <span className={cn('size-2.5 rounded-full', WARNA[warna].dot)} aria-hidden />
                      Kupon {WARNA[warna].label}
                      <span className="ml-auto text-xs font-normal text-muted-foreground">maks {batas[warna]}</span>
                    </Label>
                    <QtyStepper
                      id={`k-${warna}`}
                      value={warna === 'pink' ? pink : hijau}
                      onChange={warna === 'pink' ? setPink : setHijau}
                      max={batas[warna]}
                      ariaLabel={`Jumlah kupon ${warna}`}
                    />
                  </div>
                ))}

                {tahap === 'diberikan' && row.qtyHadir === null && (
                  <p className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden />
                    Toko ini belum tercatat hadir.
                  </p>
                )}
                <Button type="submit" className="h-11 w-full gap-2" disabled={!valid || pending}>
                  {tahap === 'dibuat' ? <Printer className="size-4" /> : <PackageCheck className="size-4" />}
                  {pending ? 'Menyimpan...' : tahap === 'dibuat' ? 'Simpan Pembuatan' : 'Simpan Pemberian'}
                </Button>
              </form>
            )}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
