'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Repeat2 } from 'lucide-react';
import { type ReactNode } from 'react';
import { BagianJumlahDus, labelSimpan, useFormJumlahDus } from './bagian-jumlah-dus';
import { RiwayatOrder } from './riwayat-order';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { Button } from '@/components/ui/button';
import { PESAN_TOLAKAN, type Tolakan } from '@/lib/order/aturan';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

/** Nilai yang perlu menonjol (dus terakhir, ranking). */
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
 * Pencatatan order oleh STAF atas nama sebuah toko.
 *
 * Bagian penyesuaian dusnya memakai komponen yang sama persis dengan layar
 * customer (BagianJumlahDus) - judul, kalimat penjelas, kotak status, sampai
 * tulisan tombol simpannya. Admin sering membimbing customer lewat telepon;
 * kalau dua layar itu berbeda kata, yang dibacakan tidak cocok dengan yang
 * dilihat di seberang.
 *
 * Yang tetap khas staf hanyalah kartu identitas toko di atas - saat mencatat
 * atas nama orang lain, memastikan tokonya benar adalah langkah yang tidak
 * boleh dilewati - dan tombol "Ganti toko" yang menempel pada kartu itu.
 *
 * Stepper mengubah angka SECARA LOKAL saja; ledger baru ditulis saat Simpan
 * ditekan, dan yang dikirim adalah selisihnya terhadap catatan terakhir. Jadi
 * menekan + berkali-kali tidak menghasilkan banyak baris di ledger.
 */
export function OrderPanel({
  target,
  total,
  rank,
  dusAwal,
  tenggat,
  customerId,
  onGantiToko,
}: {
  target: OrderTarget;
  total: number;
  rank: number | null;
  dusAwal: number | null;
  tenggat: string | null;
  /** Diisi hanya untuk jalur staff; kosong = order milik sendiri. */
  customerId?: string;
  onGantiToko: () => void;
}) {
  const qc = useQueryClient();
  const f = useFormJumlahDus({ total, dusAwal, tenggat });

  const simpan = useMutation({
    mutationFn: async () => {
      const r = await fetch('/api/order/adjust', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          customerId ? { qtyChange: f.selisih, customerId } : { qtyChange: f.selisih },
        ),
      });
      const data = await r.json();
      if (!r.ok) throw Object.assign(new Error(data.code ?? 'error'), { data });
      return data as { total: number };
    },
    onSuccess: (data) => {
      toast.success(`${target.namaToko}: ${data.total} dus tercatat.`);
      // Segarkan total/ranking di panel ini dan papan peringkat. Total baru
      // me-remount panel ini lewat key di StaffOrderClient.
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
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="mb-3 flex items-start gap-3">
          <InitialAvatar nama={target.namaToko} />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-snug">{target.namaToko}</h2>
            <p className="text-sm text-muted-foreground">{target.kodeSap}</p>
          </div>
          {/* Menempel pada identitas toko, bukan di sebelah tombol Simpan:
              di sana ia terbaca seperti "batalkan order", padahal artinya
              "toko yang saya pilih salah". */}
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onGantiToko}
            disabled={simpan.isPending}
          >
            <Repeat2 className="size-4" />
            Ganti toko
          </Button>
        </div>

        <div className="divide-y divide-border border-t border-border">
          <Row label="Depot" value={target.depot} />
          <Row label="Wilayah / Region" value={`${target.wilayah ?? '-'} / ${target.region ?? '-'}`} />
          <Row
            label="Dus Terakhir"
            value={
              <Chip className={total > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}>
                {total} dus
              </Chip>
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

      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
        <BagianJumlahDus f={f} />
      </div>

      {/* Aksi menempel di bawah layar supaya selalu terjangkau jempol,
          dan tetap aman dari home indicator iOS. */}
      <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6">
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
          onClick={() => simpan.mutate()}
          disabled={!f.bisaSimpan || simpan.isPending}
        >
          {labelSimpan(f, simpan.isPending)}
        </Button>
      </div>

      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Riwayat Penambahan
        </h3>
        <RiwayatOrder customerId={customerId} />
      </section>
    </div>
  );
}
