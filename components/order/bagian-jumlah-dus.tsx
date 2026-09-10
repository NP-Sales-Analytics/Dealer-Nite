'use client';

import { Check, CircleAlert } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { QtyStepper } from '@/components/reservation/qty-stepper';
import { Label } from '@/components/ui/label';
import { MAKS_SEKALI, PESAN_TOLAKAN } from '@/lib/order/aturan';
import { formatSisa, useSisaWaktu } from '@/lib/order/use-sisa-waktu';
import { cn } from '@/lib/utils';

/**
 * Model penyesuaian jumlah dus - SATU untuk customer maupun staf.
 *
 * Dipakai bersama, bukan disalin, justru itu intinya: judul, kalimat penjelas,
 * dan kotak statusnya harus persis sama di kedua tempat. Dua salinan yang
 * "kebetulan sama" akan melenceng pada perubahan berikutnya, dan customer yang
 * dibimbing lewat telepon oleh admin akan melihat layar yang berbeda dari yang
 * sedang dibacakan kepadanya.
 */
export type FormJumlahDus = ReturnType<typeof useFormJumlahDus>;

export function useFormJumlahDus({
  total,
  dusAwal,
  tenggat,
}: {
  total: number;
  /** Pengambilan pertama yang tercatat = lantai permanen. null = belum pernah. */
  dusAwal: number | null;
  tenggat: string | null;
}) {
  const [qty, setQty] = useState(String(total));

  const sisa = useSisaWaktu(tenggat);
  const terkunci = sisa !== null && sisa <= 0;

  const n = Number(qty);
  const valid = qty !== '' && Number.isInteger(n) && n >= 0;
  const selisih = valid ? n - total : 0;
  const diBawahLantai = valid && dusAwal !== null && n < dusAwal;
  const sekaliKebanyakan = valid && Math.abs(selisih) > MAKS_SEKALI;

  // Batas stepper dihitung dari total yang TERCATAT, bukan angka mutlak: yang
  // dibatasi adalah lompatan sekali simpan. Toko bertotal 45.000 tetap bisa
  // naik ke 55.000, cuma tidak dalam satu kali tekan Simpan.
  const batasBawah = Math.max(dusAwal ?? 0, total - MAKS_SEKALI);
  const batasAtas = total + MAKS_SEKALI;

  return {
    qty,
    setQty,
    total,
    dusAwal,
    n,
    valid,
    selisih,
    sisa,
    terkunci,
    diBawahLantai,
    sekaliKebanyakan,
    batasBawah,
    batasAtas,
    bisaSimpan:
      valid && selisih !== 0 && !diBawahLantai && !terkunci && !sekaliKebanyakan,
    /** Kembalikan ke angka yang sudah tercatat, tanpa menyentuh apa pun di server. */
    reset: () => setQty(String(total)),
  };
}

/** Label tombol simpan. Dipisah supaya tulisannya sama di kedua tempat. */
export function labelSimpan(f: FormJumlahDus, menyimpan: boolean) {
  if (menyimpan) return 'Menyimpan...';
  if (!f.bisaSimpan) return 'Simpan Order';
  return `Simpan ${f.selisih > 0 ? '+' : ''}${f.selisih} dus`;
}

/** Sisa waktu menuju tenggat. Tidak muncul sama sekali bila tenggat belum diatur. */
function ChipSisa({ f }: { f: FormJumlahDus }) {
  if (f.sisa === null) return null;
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums',
        f.terkunci ? 'bg-destructive/10 text-destructive' : 'bg-amber-100 text-amber-900',
      )}
      title="Batas waktu penambahan order"
    >
      {f.terkunci ? 'Waktu habis' : `Sisa ${formatSisa(f.sisa)}`}
    </span>
  );
}

/**
 * Satu kotak status, satu keadaan.
 *
 * Banyak customer di sini berusia lanjut dan tidak terbiasa dengan aplikasi -
 * kalimatnya menyebutkan apa yang terjadi dan apa yang harus dilakukan, bukan
 * istilah sistem.
 */
function Status({ f }: { f: FormJumlahDus }) {
  if (f.terkunci) {
    return (
      <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 px-3.5 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-destructive">
          <CircleAlert className="size-4 shrink-0" />
          Waktu penambahan sudah habis
        </p>
        <p className="mt-1 text-sm leading-relaxed text-destructive/90">
          Hubungi panitia bila masih ada yang perlu dikoreksi.
        </p>
      </div>
    );
  }

  if (!f.valid) {
    return (
      <p className="rounded-xl bg-secondary/60 px-3.5 py-3 text-sm text-muted-foreground">
        Isi dulu jumlah totalnya.
      </p>
    );
  }

  if (f.sekaliKebanyakan) {
    return (
      <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 px-3.5 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-destructive">
          <CircleAlert className="size-4 shrink-0" />
          Terlalu banyak untuk sekali simpan
        </p>
        <p className="mt-1 text-sm leading-relaxed text-destructive/90">
          Sekali simpan maksimal{' '}
          <span className="font-semibold tabular-nums">
            {MAKS_SEKALI.toLocaleString('id-ID')} dus
          </span>
          . Totalnya sendiri boleh berapa pun - simpan bertahap saja, lalu tambah lagi.
        </p>
      </div>
    );
  }

  if (f.diBawahLantai) {
    return (
      <div className="rounded-xl border-2 border-destructive/30 bg-destructive/5 px-3.5 py-3">
        <p className="flex items-center gap-2 text-sm font-bold text-destructive">
          <CircleAlert className="size-4 shrink-0" />
          Tidak bisa dikurangi lagi
        </p>
        <p className="mt-1 text-sm leading-relaxed text-destructive/90">
          Total dus tidak boleh kurang dari pengambilan pertama{' '}
          <span className="font-semibold tabular-nums">{f.dusAwal} dus</span>. Silakan hubungi Admin.
        </p>
      </div>
    );
  }

  if (f.selisih === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm font-medium text-emerald-800">
        <Check className="size-4 shrink-0" />
        Sudah tersimpan. Angka ini sudah tercatat.
      </p>
    );
  }

  // Hitungan sebelum -> perubahan -> sesudah. Angka di kotak adalah TOTAL,
  // bukan penambahan, dan salah baca di sini berarti salah catat.
  return (
    <div className="flex items-stretch gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-2 py-2.5 text-center">
      <div className="flex-1">
        <p className="text-[11px] leading-tight text-amber-900/70">Dus terakhir</p>
        <p className="text-xl font-bold tabular-nums text-amber-900/60">{f.total}</p>
      </div>
      <div className="flex-1 border-x border-amber-200">
        <p className="text-[11px] leading-tight text-amber-900/70">Perubahan</p>
        <p
          className={cn(
            'text-xl font-bold tabular-nums',
            f.selisih > 0 ? 'text-emerald-700' : 'text-red-700',
          )}
        >
          {f.selisih > 0 ? '+' : ''}
          {f.selisih}
        </p>
      </div>
      <div className="flex-1">
        <p className="text-[11px] leading-tight text-amber-900/70">Jadi</p>
        <p className="text-xl font-bold tabular-nums text-amber-900">{f.n}</p>
      </div>
    </div>
  );
}

/** Judul, penjelas, lantai pengambilan pertama, stepper, dan kotak status. */
export function BagianJumlahDus({ f, id = 'qty-dus' }: { f: FormJumlahDus; id?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Label htmlFor={id} className="text-base font-semibold leading-snug">
            Total Keseluruhan Order
          </Label>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            Isi dengan{' '}
            <span className="font-semibold text-foreground">jumlah keseluruhan pengambilan dus</span>
          </p>
        </div>
        <ChipSisa f={f} />
      </div>

      {f.dusAwal !== null && (
        <p className="flex items-center gap-2.5 rounded-xl bg-secondary/70 px-3 py-2.5 text-sm text-muted-foreground">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-card text-primary shadow-xs">
            <Check className="size-4" />
          </span>
          <span>
            Pengambilan pertama:{' '}
            <span className="font-semibold tabular-nums text-foreground">{f.dusAwal} dus</span>
          </span>
        </p>
      )}

      <QtyStepper
        id={id}
        value={f.qty}
        onChange={f.setQty}
        min={f.batasBawah}
        max={f.batasAtas}
        ariaLabel="Total keseluruhan order"
        onBatas={(arah) =>
          toast.info(
            arah === 'atas'
              ? PESAN_TOLAKAN.SEKALI_TERLALU_BANYAK
              : f.dusAwal !== null && f.batasBawah === f.dusAwal
                ? PESAN_TOLAKAN.DI_BAWAH_AWAL
                : PESAN_TOLAKAN.SEKALI_TERLALU_BANYAK,
          )
        }
      />

      <div aria-live="polite">
        <Status f={f} />
      </div>
    </div>
  );
}
