'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CircleAlert, Clock, History, Info, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Podium } from './podium';
import { RiwayatOrder } from '@/components/order/riwayat-order';
import { QtyStepper } from '@/components/reservation/qty-stepper';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PESAN_TOLAKAN, type Tolakan } from '@/lib/order/aturan';
import type { LeaderRow } from '@/lib/order/leaderboard';
import { selangPolling, useRealtimeRefresh } from '@/lib/order/use-realtime-refresh';
import { formatSisa, useSisaWaktu } from '@/lib/order/use-sisa-waktu';
import { cn, inisial, jamJakarta } from '@/lib/utils';

type DataSaya = {
  customerId: string;
  namaToko: string;
  depot: string | null;
  total: number;
  rank: number | null;
  terakhir: string | null;
  dusAwal: number | null;
  tenggat: string | null;
  top: LeaderRow[];
};

const KUNCI_ME = ['order', 'me'] as const;

/** Kartu posisi toko sendiri - identitas sekaligus angka yang sedang berlaku. */
function KartuPosisi({ me }: { me: DataSaya }) {
  return (
    <div className="rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-foreground/70">
        Posisi Toko Anda
      </p>
      <div className="mt-2.5 flex items-center gap-3">
        <span className="w-8 shrink-0 text-center text-xl font-bold tabular-nums">
          {me.rank ?? '—'}
        </span>
        <Avatar size="default" className="size-10">
          <AvatarFallback className="bg-primary-foreground/20 text-xs font-semibold text-primary-foreground">
            {inisial(me.namaToko)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug break-words">{me.namaToko}</p>
          <p className="text-[11px] leading-tight text-primary-foreground/80 break-words">
            {me.rank ? (me.depot ?? '') : 'Belum ada dus tercatat'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold leading-tight tabular-nums">{me.total}</p>
          {me.terakhir && (
            <p className="flex items-center justify-end gap-1 text-[11px] leading-tight tabular-nums text-primary-foreground/80">
              <Clock className="size-3 shrink-0" />
              {jamJakarta(me.terakhir)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Formulir order. Sengaja komponen terpisah supaya bisa di-remount lewat `key`
 * saat total dari server berubah - itulah yang menyetel ulang angka di stepper
 * sesudah tersimpan, tanpa useEffect penyelaras yang gampang salah.
 */
function FormOrder({ me }: { me: DataSaya }) {
  const qc = useQueryClient();
  const [qty, setQty] = useState(String(me.total));
  const [riwayatTerbuka, setRiwayatTerbuka] = useState(false);

  const sisa = useSisaWaktu(me.tenggat);
  const terkunci = sisa !== null && sisa <= 0;

  const n = Number(qty);
  const valid = qty !== '' && Number.isInteger(n) && n >= 0;
  const selisih = valid ? n - me.total : 0;
  const diBawahLantai = valid && me.dusAwal !== null && n < me.dusAwal;
  const bisaSimpan = valid && selisih !== 0 && !diBawahLantai && !terkunci;

  const simpan = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/order/adjust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qtyChange: selisih }),
      });
      const data = await r.json();
      if (!r.ok) throw Object.assign(new Error(data.code ?? 'error'), { data });
      return data as { total: number };
    },
    onSuccess: (data) => {
      toast.success(`Tersimpan. Total Anda sekarang ${data.total} dus.`);
      // Papan dan posisi ikut segar; total baru me-remount formulir ini lewat key.
      qc.invalidateQueries({ queryKey: ['order'] });
      qc.invalidateQueries({ queryKey: ['order-history'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
    onError: (err: unknown) => {
      const code = (err as { data?: { code?: string } })?.data?.code as Tolakan | undefined;
      toast.error(code && code in PESAN_TOLAKAN ? PESAN_TOLAKAN[code] : 'Gagal menyimpan. Coba lagi.');
    },
  });

  return (
    <>
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="qty-dus" className="text-base leading-snug">
              Total keseluruhan pengambilan dus
            </Label>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Isi dengan{' '}
              <span className="font-semibold text-foreground">total keseluruhan dus</span>, bukan tambahan.
            </p>
          </div>
          {sisa !== null && (
            <span
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
                terkunci ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-900',
              )}
              title="Batas waktu penambahan order"
            >
              {terkunci ? 'Waktu habis' : `Sisa ${formatSisa(sisa)}`}
            </span>
          )}
        </div>

        {me.dusAwal !== null && (
          <p className="flex items-center gap-2 rounded-xl bg-secondary/60 px-3.5 py-2.5 text-sm text-muted-foreground">
            <Info className="size-4 shrink-0" />
            <span>
              Pengambilan pertama:{' '}
              <span className="font-semibold text-foreground tabular-nums">{me.dusAwal} dus</span>
            </span>
          </p>
        )}

        <QtyStepper
          id="qty-dus"
          value={qty}
          onChange={setQty}
          min={me.dusAwal ?? 0}
          ariaLabel="Total keseluruhan pengambilan dus"
        />

        {/* Satu kotak status, satu keadaan. Banyak customer di sini berusia
            lanjut dan tidak terbiasa dengan aplikasi - kalimatnya menyebutkan
            apa yang terjadi dan apa yang harus dilakukan, bukan istilah sistem. */}
        <div aria-live="polite">
          {terkunci ? (
            <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 px-3.5 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-destructive">
                <CircleAlert className="size-4 shrink-0" />
                Waktu penambahan sudah habis
              </p>
              <p className="mt-1 text-sm leading-relaxed text-destructive/90">
                Hubungi panitia bila masih ada yang perlu dikoreksi.
              </p>
            </div>
          ) : !valid ? (
            <p className="rounded-xl bg-secondary/60 px-3.5 py-3 text-sm text-muted-foreground">
              Isi dulu jumlah totalnya.
            </p>
          ) : diBawahLantai ? (
            <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 px-3.5 py-3">
              <p className="flex items-center gap-2 text-sm font-bold text-destructive">
                <CircleAlert className="size-4 shrink-0" />
                Tidak bisa dikurangi lagi
              </p>
              <p className="mt-1 text-sm leading-relaxed text-destructive/90">
                Total dus tidak boleh kurang dari pengambilan pertama{' '}
                <span className="font-semibold tabular-nums">{me.dusAwal} dus</span>. Silakan hubungi
                Admin.
              </p>
            </div>
          ) : selisih === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-800">
              <Check className="size-4 shrink-0" />
              Sudah tersimpan. Angka ini sudah tercatat.
            </p>
          ) : (
            /* Hitungan sebelum -> perubahan -> sesudah. Angka di kotak adalah
               TOTAL, bukan penambahan, dan salah baca di sini berarti salah catat. */
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3.5">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <span className="size-2.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
                Belum tersimpan
              </p>

              <div className="mt-3 flex items-stretch gap-2 text-center">
                <div className="flex-1">
                  <p className="text-[11px] leading-tight text-amber-900/70">Dus terakhir</p>
                  <p className="text-2xl font-bold tabular-nums text-amber-900/60">{me.total}</p>
                </div>
                <div className="flex-1 border-x border-amber-200">
                  <p className="text-[11px] leading-tight text-amber-900/70">Perubahan</p>
                  <p
                    className={cn(
                      'text-2xl font-bold tabular-nums',
                      selisih > 0 ? 'text-emerald-700' : 'text-red-700',
                    )}
                  >
                    {selisih > 0 ? '+' : ''}
                    {selisih}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] leading-tight text-amber-900/70">Jadi</p>
                  <p className="text-2xl font-bold tabular-nums text-amber-900">{n}</p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* SELURUH aksi menempel di bawah layar, bukan hanya tombol simpan.
          Kalau tombol sekunder ditinggal di dalam kartu, bar yang menempel ini
          justru menutupinya begitu halaman sedikit lebih panjang dari layar -
          dan yang tertutup itu satu-satunya jalan ke riwayat order.
          Tetap aman dari home indicator iOS lewat safe-area. */}
      <div className="sticky bottom-0 -mx-4 space-y-2.5 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-11 flex-1 text-sm"
            onClick={() => setRiwayatTerbuka(true)}
          >
            <History className="size-4" />
            Riwayat Order
          </Button>
          {/* Hanya muncul saat memang ada yang bisa dibatalkan. Tombol "Reset"
              yang selalu nongkrong di sebelah angka order terbaca seperti
              "hapus order saya" - persis kesalahpahaman yang harus dihindari. */}
          {selisih !== 0 && (
            <Button
              variant="outline"
              className="h-11 flex-1 text-sm"
              onClick={() => setQty(String(me.total))}
              disabled={simpan.isPending}
            >
              <RotateCcw className="size-4" />
              Batalkan
            </Button>
          )}
        </div>
        <Button
          className="h-13 w-full text-base font-semibold"
          onClick={() => simpan.mutate()}
          disabled={!bisaSimpan || simpan.isPending}
        >
          {simpan.isPending
            ? 'Menyimpan...'
            : terkunci
              ? 'Waktu Habis'
              : bisaSimpan
                ? `Simpan ${n} dus`
                : 'Simpan Order'}
        </Button>
      </div>

      <Dialog open={riwayatTerbuka} onOpenChange={setRiwayatTerbuka}>
        <DialogContent
          showCloseButton={false}
          className="grid max-h-[80svh] w-full max-w-md grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl p-0"
        >
          <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <DialogTitle className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Riwayat Penambahan
              </DialogTitle>
              <p className="mt-0.5 break-words text-base font-semibold leading-snug">
                {me.namaToko}
              </p>
            </div>
            <DialogClose
              aria-label="Tutup"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-4" />
            </DialogClose>
          </header>
          <div className="min-h-0 overflow-y-auto px-5 py-4">
            <RiwayatOrder />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Satu halaman untuk customer: papan peringkat DAN penambahan order.
 *
 * Dulu keduanya halaman terpisah, dan untuk berpindah customer harus membuka
 * menu samping lebih dulu. Bagi tamu yang tidak terbiasa dengan aplikasi, ikon
 * hamburger itu sendiri sudah jadi penghalang - banyak yang tidak sadar ada
 * halaman lain di baliknya. Disatukan supaya tidak ada yang perlu dicari:
 * begitu masuk, papan dan tombol ordernya sudah ada di layar yang sama.
 *
 * Perannya ditentukan di server (app/(app)/leaderboard/page.tsx), jadi tampilan
 * tim sama sekali tidak tersentuh perubahan ini.
 *
 * Seluruh isinya berasal dari SATU request /api/order/me - podium, posisi
 * sendiri, lantai pengambilan pertama, dan tenggat - sehingga tidak ada dua
 * angka yang bisa saling bertentangan di layar.
 */
export function CustomerBoard() {
  const qc = useQueryClient();

  const { tersambung } = useRealtimeRefresh(() => {
    qc.invalidateQueries({ queryKey: KUNCI_ME });
    qc.invalidateQueries({ queryKey: ['order-history'] });
  });

  const me = useQuery({
    queryKey: KUNCI_ME,
    queryFn: async (): Promise<DataSaya> => {
      const r = await fetch('/api/order/me');
      if (!r.ok) throw new Error('me');
      return r.json();
    },
    refetchInterval: selangPolling(tersambung),
  });

  if (!me.data) {
    return (
      <div className="mx-auto max-w-md space-y-3">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-3">
      <Podium top3={me.data.top} meId={me.data.customerId} />
      <KartuPosisi me={me.data} />
      {/* key: total baru dari server menyetel ulang angka di stepper. */}
      <FormOrder key={me.data.total} me={me.data} />
    </main>
  );
}
