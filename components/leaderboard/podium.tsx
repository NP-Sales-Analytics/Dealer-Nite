import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { LeaderRow } from '@/lib/order/leaderboard';
import { cn, inisial } from '@/lib/utils';

// Emas / perak / perunggu. Aplikasi ini light-only, jadi nilainya dipatok
// langsung, bukan lewat token tema.
const GAYA = [
  { cincin: 'ring-amber-400', isi: 'bg-amber-50 text-amber-900', lencana: 'bg-amber-400' },
  { cincin: 'ring-slate-300', isi: 'bg-slate-50 text-slate-700', lencana: 'bg-slate-400' },
  { cincin: 'ring-amber-700/70', isi: 'bg-orange-50 text-amber-900', lencana: 'bg-amber-700' },
];

function Spot({ row, juara, saya }: { row?: LeaderRow; juara: 1 | 2 | 3; saya?: boolean }) {
  if (!row) return <div className="flex-1" />;
  const gaya = GAYA[juara - 1];
  const utama = juara === 1;

  return (
    // Nama toko dibiarkan membungkus (bukan dipotong) supaya terbaca utuh;
    // karena tingginya jadi tidak sama, podium disusun dari atas dan juara
    // ditinggikan lewat margin peraih posisi 2 & 3.
    <div className={cn('flex min-w-0 flex-1 flex-col items-center gap-1', !utama && 'mt-5')}>
      {/* Nomor peringkat sebagai lencana bulat yang menumpuk di tepi bawah foto,
          bukan teks "#n" terpisah. */}
      <div className="relative mb-2">
        <Avatar
          size="default"
          className={cn(utama ? 'size-16' : 'size-14', 'ring-2 ring-offset-2 ring-offset-card', gaya.cincin)}
        >
          <AvatarFallback className={cn('font-bold', gaya.isi, utama ? 'text-base' : 'text-sm')}>
            {inisial(row.namaToko)}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute -bottom-1.5 left-1/2 grid -translate-x-1/2 place-items-center rounded-full font-bold text-white ring-2 ring-card',
            utama ? 'size-6 text-xs' : 'size-5 text-[11px]',
            gaya.lencana,
          )}
        >
          {row.rank}
        </span>
      </div>

      <span className="w-full text-center text-[13px] font-medium leading-tight break-words">
        {row.namaToko}
      </span>
      {row.depot && (
        <span className="w-full text-center text-[10px] leading-tight text-muted-foreground break-words">
          {row.depot}
        </span>
      )}
      <span className="text-sm font-bold tabular-nums">{row.total}</span>
      {saya && (
        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          Anda
        </span>
      )}
    </div>
  );
}

export function Podium({ top3, meId }: { top3: LeaderRow[]; meId?: string }) {
  const [first, second, third] = top3;
  return (
    <div className="flex items-start justify-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-xs">
      <Spot row={second} juara={2} saya={!!second && second.customerId === meId} />
      <Spot row={first} juara={1} saya={!!first && first.customerId === meId} />
      <Spot row={third} juara={3} saya={!!third && third.customerId === meId} />
    </div>
  );
}
