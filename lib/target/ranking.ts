export type RankableTarget = {
  customerId: string;
  mgName: string;
  targetEfektif: number;
  lastAdjustedAt: string | Date | null;
};

export function rankTargets<T extends RankableTarget>(rows: T[]): Array<T & { rank: number }> {
  return [...rows]
    .sort((left, right) => {
      const byTarget = right.targetEfektif - left.targetEfektif;
      if (byTarget) return byTarget;
      const leftTime = left.lastAdjustedAt ? new Date(left.lastAdjustedAt).getTime() : 0;
      const rightTime = right.lastAdjustedAt ? new Date(right.lastAdjustedAt).getTime() : 0;
      return leftTime - rightTime || left.mgName.localeCompare(right.mgName, 'id');
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
