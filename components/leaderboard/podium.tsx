import type { LeaderRow } from '@/lib/order/leaderboard';
import { cn, inisial, jamJakarta, tanggalJakarta } from '@/lib/utils';

/**
 * Emas / perak / perunggu, plus tinggi batangnya. Aplikasi ini light-only, jadi
 * nilainya dipatok langsung, bukan lewat token tema.
 *
 * Tingginya DIPATOK per peringkat, bukan diskalakan dari jumlah dus. Di malam
 * event selisih tiga besar sering cuma beberapa dus - batang proporsional akan
 * terlihat rata dan podiumnya kehilangan bentuk, padahal justru bentuk itulah
 * yang menyampaikan "siapa juara" dalam sekali lihat.
 */
const GAYA = [
  {
    cincin: 'ring-amber-400',
    isi: 'bg-amber-50 text-amber-600',
    lencana: 'bg-amber-400',
    batang: 'bg-amber-400 text-amber-950',
    tinggi: 'h-22',
    angka: 'text-3xl',
    foto: 'size-16',
    label: 'size-6 text-xs',
  },
  {
    cincin: 'ring-slate-300',
    isi: 'bg-slate-100 text-indigo-600',
    lencana: 'bg-slate-400',
    batang: 'bg-slate-300 text-slate-700',
    tinggi: 'h-16',
    angka: 'text-2xl',
    foto: 'size-14',
    label: 'size-5 text-[11px]',
  },
  {
    cincin: 'ring-orange-300',
    isi: 'bg-orange-50 text-amber-800',
    lencana: 'bg-amber-700',
    batang: 'bg-orange-200 text-amber-900',
    tinggi: 'h-12',
    angka: 'text-xl',
    foto: 'size-14',
    label: 'size-5 text-[11px]',
  },
];

function Spot({ row, juara, saya }: { row?: LeaderRow; juara: 1 | 2 | 3; saya?: boolean }) {
  // Tempat kosong tetap memakan satu kolom supaya juara 1 tidak bergeser dari
  // tengah saat pesertanya belum genap tiga.
  if (!row) return <div className="flex-1" />;
  const gaya = GAYA[juara - 1];

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      {/* Nomor peringkat sebagai lencana bulat yang menumpuk di tepi bawah foto,
          bukan teks "#n" terpisah. */}
      <div className="relative mb-2">
        <div
          className={cn(
            'grid place-items-center rounded-full font-bold ring-2 ring-offset-2 ring-offset-card',
            gaya.foto,
            gaya.cincin,
            gaya.isi,
            juara === 1 ? 'text-base' : 'text-sm',
          )}
          aria-hidden
        >
          {inisial(row.namaToko)}
        </div>
        <span
          className={cn(
            'absolute -bottom-1.5 left-1/2 grid -translate-x-1/2 place-items-center rounded-full font-bold text-white ring-2 ring-card',
            gaya.label,
            gaya.lencana,
          )}
        >
          {row.rank}
        </span>
      </div>

      {/* Nama dibiarkan membungkus, bukan dipotong: toko harus bisa mengenali
          dirinya sendiri, dan nama yang terpotong justru memicu pertanyaan. */}
      <span className="w-full text-center text-[13px] font-bold leading-tight break-words">
        {row.namaToko}
      </span>

      {/* Depot dan waktu jadi satu baris. Waktu inilah yang memenangkan seri,
          jadi ikut ditampilkan supaya urutannya bisa dijelaskan tanpa bertanya. */}
      <span
        className="mt-0.5 w-full text-center text-[10px] leading-tight text-muted-foreground break-words"
        title={row.terakhir ? `Mencapai angka ini pada ${tanggalJakarta(row.terakhir)}` : undefined}
      >
        {[row.depot, row.terakhir && jamJakarta(row.terakhir)].filter(Boolean).join(' · ')}
      </span>

      {saya && (
        <span className="mt-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          Anda
        </span>
      )}

      <div
        className={cn(
          'mt-2 grid w-full place-items-center rounded-t-xl',
          gaya.tinggi,
          gaya.batang,
        )}
      >
        <span className={cn('font-bold tabular-nums', gaya.angka)}>{row.total}</span>
      </div>
    </div>
  );
}

/**
 * Tiga besar sebagai podium batang - dipakai SEMUA peran, customer maupun tim.
 *
 * items-end membuat ketiga batang duduk di satu garis dasar sekalipun nama toko
 * di atasnya berbeda jumlah barisnya; yang memanjang ke atas, bukan turun.
 */
export function Podium({ top3, meId }: { top3: LeaderRow[]; meId?: string }) {
  const [first, second, third] = top3;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card px-4 pt-4 shadow-xs">
      <div className="flex items-end justify-center gap-2">
        <Spot row={second} juara={2} saya={!!second && second.customerId === meId} />
        <Spot row={first} juara={1} saya={!!first && first.customerId === meId} />
        <Spot row={third} juara={3} saya={!!third && third.customerId === meId} />
      </div>
    </div>
  );
}
