import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { LeaderRow } from '@/lib/order/leaderboard';
import { cn, inisial } from '@/lib/utils';

function Spot({ row, highlight }: { row?: LeaderRow; highlight?: boolean }) {
  if (!row) return <div className="flex-1" />;
  return (
    <div className={cn('flex flex-1 flex-col items-center gap-1', highlight && '-mt-4')}>
      <Avatar size="lg" className={cn(highlight && 'ring-2 ring-primary')}>
        <AvatarFallback>{inisial(row.namaToko)}</AvatarFallback>
      </Avatar>
      <span className="text-xs font-semibold tabular-nums text-muted-foreground">#{row.rank}</span>
      <span className="line-clamp-1 max-w-full text-center text-sm font-medium">{row.namaToko}</span>
      <span className="text-sm font-bold tabular-nums">{row.total}</span>
    </div>
  );
}

export function Podium({ top3 }: { top3: LeaderRow[] }) {
  const [first, second, third] = top3;
  return (
    <div className="flex items-end justify-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-xs">
      <Spot row={second} />
      <Spot row={first} highlight />
      <Spot row={third} />
    </div>
  );
}
