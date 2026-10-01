import { describe, expect, it } from 'vitest';
import { resolveDashboardDealerNight } from '@/lib/dashboard/scope';
import { mysqlInFilter, mysqlNullsLast } from '@/lib/db/mysql-query';

describe('MySQL dashboard query helpers', () => {
  it('builds parameterized MySQL multi-value filters', () => {
    const condition = mysqlInFilter('depot_code', ['1S', '5C']);
    expect(condition.sql).toBe('depot_code IN (?, ?)');
    expect(condition.params).toEqual(['1S', '5C']);
  });

  it('returns a false condition for an explicitly empty list', () => {
    expect(mysqlInFilter('depot_code', [])).toEqual({ sql: '1 = 0', params: [] });
  });

  it('orders missing timestamps last in both directions', () => {
    expect(mysqlNullsLast('last_at', 'asc')).toBe('last_at IS NULL ASC, last_at ASC');
    expect(mysqlNullsLast('last_at', 'desc')).toBe('last_at IS NULL ASC, last_at DESC');
  });
});

describe('Dealer Night dashboard scope', () => {
  it('keeps a scoped account out of another event dashboard', () => {
    expect(() => resolveDashboardDealerNight(
      { role: 'admin', dealerNightIds: ['bogor'] },
      'bandung',
    )).toThrow('Tidak punya akses');
  });

  it('uses the only assigned event when none is requested', () => {
    expect(resolveDashboardDealerNight({ role: 'dn_user', dealerNightIds: ['bogor'] }, null)).toBe('bogor');
  });

  it('requires a choice when several events are allowed', () => {
    expect(() => resolveDashboardDealerNight({ role: 'admin', dealerNightIds: ['bogor', 'bandung'] }, null))
      .toThrow('wajib dipilih');
    expect(() => resolveDashboardDealerNight({ role: 'management', dealerNightIds: null }, null)).toThrow('wajib dipilih');
  });
});
