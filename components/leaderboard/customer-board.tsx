'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { History, Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Podium } from './podium';
import {
  BagianJumlahDus,
  labelSimpan,
  useFormJumlahDus,
} from '@/components/order/bagian-jumlah-dus';
import { RiwayatOrder } from '@/components/order/riwayat-order';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { pesanGagal } from '@/lib/order/aturan';
import type { LeaderRow } from '@/lib/order/leaderboard';
import { selangPolling, useRealtimeRefresh } from '@/lib/order/use-realtime-refresh';
import { inisial, jamJakarta } from '@/lib/utils';

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

/** Tombol tutup bulat di pojok panel, sama bentuknya di kedua panel. */
function TombolTutup({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Tutup"
      className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <X className="size-4" />
    </button>
  );
}

/** Peringkat 4 dan 5 - lanjutan podium, sebatas yang boleh dilihat customer. */
function DaftarLanjutan({ rows }: { rows: LeaderRow[] }) {
  if (rows.length === 0) return null;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      {rows.map((row) => (
        <li key={row.customerId} className="flex items-center gap-3 px-4 py-2.5">
          <span className="w-4 shrink-0 text-center text-sm font-medium tabular-nums text-muted-foreground">
            {row.rank}
          </span>
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-foreground"
            aria-hidden
          >
            {inisial(row.namaToko)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug break-words">{row.namaToko}</p>
            {row.depot && (
              <p className="text-[11px] leading-tight text-muted-foreground break-words">
                {row.depot}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-bold leading-tight tabular-nums">{row.total}</p>
            {row.terakhir && (
              <p className="text-[11px] leading-tight tabular-nums text-muted-foreground">
                {jamJakarta(row.terakhir)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

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
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-foreground/20 text-xs font-semibold text-primary-foreground"
          aria-hidden
        >
          {inisial(me.namaToko)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug break-words">{me.namaToko}</p>
          <p className="text-[11px] leading-tight text-primary-foreground/80 break-words">
            {me.rank ? (me.depot ?? '') : 'Belum ada dus tercatat'}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-bold leading-tight tabular-nums">{me.total}</p>
          {me.terakhir && (
            <p className="text-[11px] leading-tight tabular-nums text-primary-foreground/80">
              {jamJakarta(me.terakhir)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Isi panel Tambah Order.
 *
 * Dipisah dari panelnya supaya bisa di-remount lewat `key` saat total dari
 * server berubah - itulah yang menyetel ulang angka di stepper sesudah
 * tersimpan, tanpa useEffect penyelaras yang gampang salah.
 */
function IsiTambahOrder({ me, onTutup }: { me: DataSaya; onTutup: () => void }) {
  const qc = useQueryClient();
  const f = useFormJumlahDus({ total: me.total, dusAwal: me.dusAwal, tenggat: me.tenggat });
  const sedangMengirim = useRef(false);

  const simpan = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/order/adjust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qtyChange: f.selisih }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) throw Object.assign(new Error(data?.code ?? 'error'), { data, status: r.status });
      return data as { total: number };
    },
    onSuccess: (data) => {
      toast.success(`Tersimpan. Total Anda sekarang ${data.total} dus.`);
      qc.invalidateQueries({ queryKey: ['order'] });
      qc.invalidateQueries({ queryKey: ['order-history'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
      // Panel ditutup supaya angka barunya langsung terlihat di papan di
      // belakangnya - itu konfirmasi yang lebih meyakinkan daripada toast.
      onTutup();
    },
    onError: (err: unknown) => {
      const { status = 0, data } = (err ?? {}) as { status?: number; data?: unknown };
      toast.error(pesanGagal(status, data));
    },
    onSettled: () => {
      sedangMengirim.current = false;
    },
  });

  const kirim = () => {
    // Ref berubah sinkron pada event pertama, sebelum atribut disabled sempat
    // dirender. Dua click event dalam satu frame tetap hanya mengirim sekali.
    if (sedangMengirim.current || !f.bisaSimpan) return;
    sedangMengirim.current = true;
    simpan.mutate();
  };

  return (
    <>
      <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <SheetTitle className="text-xl font-bold leading-snug">Tambah Order</SheetTitle>
          <p className="mt-0.5 break-words text-[13px] leading-snug text-muted-foreground">
            {[me.namaToko, me.depot].filter(Boolean).join(' · ')}
          </p>
        </div>
        <TombolTutup onClose={onTutup} />
      </header>

      <div className="px-5">
        <BagianJumlahDus f={f} />
      </div>

      <div className="flex gap-3 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        <Button
          variant="outline"
          className="h-12 flex-1 text-base"
          onClick={f.reset}
          disabled={f.selisih === 0 || simpan.isPending}
        >
          Reset
        </Button>
        <Button
          className="h-12 flex-[2] text-base font-semibold"
          onClick={kirim}
          disabled={!f.bisaSimpan || simpan.isPending}
        >
          {labelSimpan(f, simpan.isPending)}
        </Button>
      </div>
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
 * Formulir ordernya sendiri ditaruh di panel yang muncul dari bawah, bukan
 * dibentangkan di halaman. Yang dilihat pertama jadi tetap papan peringkat -
 * alasan tamu membuka aplikasi ini - sementara penambahan order tinggal satu
 * ketukan pada tombol yang selalu menempel di bawah layar.
 *
 * Perannya ditentukan di server (app/(app)/leaderboard/page.tsx), jadi tampilan
 * tim sama sekali tidak tersentuh perubahan ini - kecuali podiumnya, yang
 * memang sengaja dipakai bersama.
 *
 * Seluruh isinya berasal dari SATU request /api/order/me - papan, posisi
 * sendiri, lantai pengambilan pertama, dan tenggat - sehingga tidak ada dua
 * angka yang bisa saling bertentangan di layar.
 */
export function CustomerBoard() {
  const qc = useQueryClient();
  const [panel, setPanel] = useState<'order' | 'riwayat' | null>(null);

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
      <div className="mx-auto w-full max-w-md space-y-3">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  const data = me.data;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <div className="space-y-3">
        <Podium top3={data.top.slice(0, 3)} meId={data.customerId} />
        <DaftarLanjutan rows={data.top.slice(3)} />
        <KartuPosisi me={data} />
      </div>

      {/* mt-auto DAN sticky, keduanya perlu dan menangani kasus yang berbeda:
          saat isinya pendek halaman tidak menggulir sama sekali sehingga sticky
          diam saja di aliran normal - mt-auto yang menjatuhkannya ke dasar.
          Saat isinya panjang, sticky yang menahannya tetap terlihat.
          pb safe-area menjaganya dari home indicator iOS. */}
      <div className="sticky bottom-0 -mx-4 mt-auto flex gap-3 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
        <Button
          variant="outline"
          className="h-12 flex-1 text-base"
          onClick={() => setPanel('riwayat')}
        >
          <History className="size-4" />
          Riwayat Order
        </Button>
        <Button
          className="h-12 flex-[1.4] text-base font-semibold"
          onClick={() => setPanel('order')}
        >
          <Plus className="size-5" />
          Tambah Order
        </Button>
      </div>

      <Sheet open={panel === 'order'} onOpenChange={(v) => !v && setPanel(null)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto max-h-[92svh] gap-0 overflow-y-auto rounded-t-2xl p-0 sm:max-w-md"
        >
          {/* key: total baru dari server menyetel ulang angka di stepper. */}
          <IsiTambahOrder key={data.total} me={data} onTutup={() => setPanel(null)} />
        </SheetContent>
      </Sheet>

      <Sheet open={panel === 'riwayat'} onOpenChange={(v) => !v && setPanel(null)}>
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="mx-auto grid max-h-[85svh] grid-rows-[auto_minmax(0,1fr)] gap-0 rounded-t-2xl p-0 sm:max-w-md"
        >
          {/* Bentuknya disamakan dengan panel Tambah Order: judul tebal di
              atas, identitas toko sebagai baris kedua. Dua panel yang muncul
              dari tempat yang sama sebaiknya juga terbaca dengan cara yang
              sama - kalau susunannya berbeda, orang harus membaca ulang untuk
              tahu sedang berada di mana. */}
          <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="min-w-0">
              <SheetTitle className="text-xl font-bold leading-snug">Riwayat Order</SheetTitle>
              <p className="mt-0.5 break-words text-[13px] leading-snug text-muted-foreground">
                {[data.namaToko, data.depot].filter(Boolean).join(' · ')}
              </p>
            </div>
            <TombolTutup onClose={() => setPanel(null)} />
          </header>
          <div className="min-h-0 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <RiwayatOrder />
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}
