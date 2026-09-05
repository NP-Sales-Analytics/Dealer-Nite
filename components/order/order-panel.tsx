'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { QtyStepper } from '@/components/reservation/qty-stepper';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PESAN_TOLAKAN, type Tolakan } from '@/lib/order/aturan';
import { formatSisa, useSisaWaktu } from '@/lib/order/use-sisa-waktu';
import { cn } from '@/lib/utils';

export type OrderTarget = {
  namaToko: string;
  kodeSap: string;
  depot: string | null;
  wilayah: string | null;
  region: string | null;
};

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-center justify-between gap-4 py-2 text-sm">
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value ?? '-'}</span>
  </div>
);

/** Nilai yang perlu menonjol (dus terakhir, pengambilan pertama, ranking). */
const Chip = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold tabular-nums',
      className,
    )}
  >
    {children}
  </span>
);

// Peringkat 1-3 memakai warna medali yang sama dengan podium leaderboard.
const GAYA_RANK: Record<number, string> = {
  1: 'bg-amber-100 text-amber-900',
  2: 'bg-slate-200 text-slate-700',
  3: 'bg-orange-100 text-orange-900',
};

/**
 * Kartu detail toko + stepper jumlah dus, sepola dengan Pencatatan Kehadiran.
 *
 * Stepper mengubah angka SECARA LOKAL saja; ledger baru ditulis saat "Simpan
 * Order" ditekan, dan yang dikirim adalah selisihnya terhadap catatan terakhir.
 * Jadi menekan + berkali-kali tidak menghasilkan banyak baris di ledger.
 *
 * Dua batasan ikut ditampilkan: lantai pengambilan pertama dan tenggat waktu.
 * Keduanya tetap ditegakkan di /api/order/adjust - yang di sini hanya penjelasan
 * supaya orang tidak terlanjur mengetik angka yang pasti ditolak.
 */
export function OrderPanel({
  target,
  total,
  rank,
  dusAwal,
  tenggat,
  customerId,
  onBatal,
  labelBatal = 'Batal',
}: {
  target: OrderTarget;
  total: number;
  rank: number | null;
  /** Pengambilan pertama yang tercatat = lantai permanen. null = belum pernah. */
  dusAwal: number | null;
  tenggat: string | null;
  /** Diisi hanya untuk jalur staff; kosong = order milik sendiri (customer). */
  customerId?: string;
  onBatal: () => void;
  labelBatal?: string;
}) {
  const qc = useQueryClient();
  // Sumber kebenaran untuk selisih. Hanya berubah setelah simpan berhasil.
  const [tercatat, setTercatat] = useState(total);
  const [qty, setQty] = useState(String(total));

  const sisa = useSisaWaktu(tenggat);
  const terkunci = sisa !== null && sisa <= 0;

  const lantai = dusAwal ?? 0;
  const n = Number(qty);
  const valid = qty !== '' && Number.isInteger(n) && n >= 0;
  const selisih = valid ? n - tercatat : 0;
  const diBawahLantai = valid && dusAwal !== null && n < dusAwal;

  const simpan = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/order/adjust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(customerId ? { qtyChange: selisih, customerId } : { qtyChange: selisih }),
      });
      const data = await r.json();
      if (!r.ok) throw Object.assign(new Error(data.code ?? 'error'), { data });
      return data as { total: number };
    },
    onSuccess: (data) => {
      setTercatat(data.total);
      setQty(String(data.total));
      toast.success(`${target.namaToko}: ${data.total} dus tercatat.`);
      // Segarkan total/ranking di panel ini dan papan Top Spender.
      qc.invalidateQueries({ queryKey: ['order'] });
      qc.invalidateQueries({ queryKey: ['leaderboard'] });
    },
    onError: (err: unknown) => {
      const code = (err as { data?: { code?: string } })?.data?.code as Tolakan | undefined;
      toast.error(code && code in PESAN_TOLAKAN ? PESAN_TOLAKAN[code] : 'Gagal menyimpan. Coba lagi.');
    },
  });

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="mb-3 flex items-start gap-3">
          <InitialAvatar nama={target.namaToko} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-snug">{target.namaToko}</h2>
            <p className="text-sm text-muted-foreground">{target.kodeSap}</p>
          </div>
        </div>

        <div className="divide-y divide-border border-t border-border">
          <Row label="Depot" value={target.depot} />
          <Row label="Wilayah / Region" value={`${target.wilayah ?? '-'} / ${target.region ?? '-'}`} />
          <Row
            label="Dus Terakhir"
            value={
              <Chip className={tercatat > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}>
                {tercatat} dus
              </Chip>
            }
          />
          <Row
            label="Pengambilan Pertama"
            value={
              dusAwal === null ? (
                <span className="text-muted-foreground">Belum ada</span>
              ) : (
                <Chip className="bg-secondary text-foreground">{dusAwal} dus</Chip>
              )
            }
          />
          <Row
            label="Posisi Ranking"
            value={
              rank ? (
                <Chip className={GAYA_RANK[rank] ?? 'bg-secondary text-foreground'}>#{rank}</Chip>
              ) : (
                <span className="text-muted-foreground">Belum masuk ranking</span>
              )
            }
          />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Label htmlFor="qty-dus" className="text-base">
              Total keseluruhan pengambilan dus
            </Label>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Isi dengan <span className="font-semibold text-foreground">jumlah keseluruhan dus</span>,
              bukan tambahannya.
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

        <QtyStepper
          id="qty-dus"
          value={qty}
          onChange={setQty}
          min={lantai}
          ariaLabel="Total keseluruhan pengambilan dus"
        />

        {/* Ringkasan dibuat menonjol dan berbentuk hitungan sebelum -> perubahan
            -> sesudah. Angka di kotak adalah TOTAL, bukan penambahan, dan banyak
            customer berusia lanjut - salah baca di sini berarti salah catat. */}
        {terkunci ? (
          <p className="rounded-xl border-2 border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm font-medium text-destructive">
            Waktu penambahan sudah habis. Hubungi panitia bila ada yang perlu dikoreksi.
          </p>
        ) : !valid ? (
          <p className="rounded-xl bg-secondary/60 px-3.5 py-3 text-sm text-muted-foreground">
            Isi dulu jumlah totalnya.
          </p>
        ) : diBawahLantai ? (
          <p className="rounded-xl border-2 border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm font-medium text-destructive">
            Tidak boleh kurang dari pengambilan pertama ({dusAwal} dus).
          </p>
        ) : selisih === 0 ? (
          <p className="rounded-xl bg-secondary/60 px-3.5 py-3 text-sm text-muted-foreground">
            Angkanya masih sama dengan catatan terakhir.
          </p>
        ) : (
          <div aria-live="polite" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3.5">
            <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
              <span className="size-2.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
              Belum tersimpan
            </p>

            <div className="mt-3 flex items-stretch gap-2 text-center">
              <div className="flex-1">
                <p className="text-[11px] leading-tight text-amber-900/70">Dus terakhir</p>
                <p className="text-2xl font-bold tabular-nums text-amber-900/60">{tercatat}</p>
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

            <p className="mt-3 text-xs leading-relaxed text-amber-900/80">
              Tekan <span className="font-semibold">Simpan</span> di bawah supaya tercatat.
            </p>
          </div>
        )}
      </div>

      {/* Aksi menempel di bawah layar supaya selalu terjangkau jempol,
          dan tetap aman dari home indicator iOS. */}
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button
          variant="outline"
          className="h-12 flex-1 text-base md:flex-none md:px-6"
          onClick={() => {
            setQty(String(tercatat));
            onBatal();
          }}
          disabled={simpan.isPending}
        >
          {labelBatal}
        </Button>
        <Button
          className="h-12 flex-[2] text-base md:flex-none md:px-8"
          onClick={() => simpan.mutate()}
          disabled={!valid || selisih === 0 || diBawahLantai || terkunci || simpan.isPending}
        >
          {simpan.isPending
            ? 'Menyimpan...'
            : terkunci
              ? 'Waktu Habis'
              : selisih === 0
                ? 'Simpan Order'
                : `Simpan ${selisih > 0 ? '+' : ''}${selisih} dus`}
        </Button>
      </div>
    </div>
  );
}
