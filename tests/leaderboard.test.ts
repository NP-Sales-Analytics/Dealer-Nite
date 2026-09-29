import { describe, expect, it } from 'vitest';
import { rankTargets } from '@/lib/target/ranking';

describe('Target DN leaderboard ranking', () => {
  it('ranks the largest effective target first', () => {
    const rows = rankTargets([
      { customerId: 'b', mgName: 'B', targetEfektif: 820_000_000, lastAdjustedAt: null },
      { customerId: 'a', mgName: 'A', targetEfektif: 5_619_000_000, lastAdjustedAt: null },
    ]);
    expect(rows.map((row) => [row.rank, row.customerId])).toEqual([[1, 'a'], [2, 'b']]);
  });

  it('breaks equal targets by earliest adjustment then MG name', () => {
    const rows = rankTargets([
      { customerId: 'z', mgName: 'ZETA', targetEfektif: 100, lastAdjustedAt: '2026-09-29T12:00:00Z' },
      { customerId: 'b', mgName: 'BETA', targetEfektif: 100, lastAdjustedAt: '2026-09-29T10:00:00Z' },
      { customerId: 'a', mgName: 'ALFA', targetEfektif: 100, lastAdjustedAt: '2026-09-29T10:00:00Z' },
    ]);
    expect(rows.map((row) => row.customerId)).toEqual(['a', 'b', 'z']);
  });
});
