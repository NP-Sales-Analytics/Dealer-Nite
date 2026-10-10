import { describe, expect, it } from 'vitest';
import { cakupanDnAkun, canAdjustTarget, canReadDealerNight, superAdminPusat } from '@/lib/access';

describe('Dealer Night authorization', () => {
  it('limits a scoped account to its Dealer Nights', () => {
    const user = { role: 'dn_user', dealerNightIds: ['bogor'] } as const;
    expect(canReadDealerNight(user, 'bogor')).toBe(true);
    expect(canReadDealerNight(user, 'bandung')).toBe(false);
    expect(canAdjustTarget(user, 'bogor')).toBe(false);
  });

  it('lets a scoped admin adjust only its own Dealer Night', () => {
    const user = { role: 'admin', dealerNightIds: ['bandung'] } as const;
    expect(canAdjustTarget(user, 'bandung')).toBe(true);
    expect(canAdjustTarget(user, 'bogor')).toBe(false);
  });

  it('supports several Dealer Nights on one account', () => {
    const user = { role: 'marketing', dealerNightIds: ['bogor', 'bandung'] } as const;
    expect(canReadDealerNight(user, 'bandung')).toBe(true);
    expect(canReadDealerNight(user, 'medan')).toBe(false);
  });

  it.each(['superadmin', 'admin'] as const)('%s with all scope may adjust every Dealer Night', (role) => {
    expect(canReadDealerNight({ role, dealerNightIds: null }, 'bogor')).toBe(true);
    expect(canAdjustTarget({ role, dealerNightIds: null }, 'bogor')).toBe(true);
  });

  // getSessionUser mengisi dealerNightIds Super Admin wilayah dengan DN wilayahnya.
  it('Super Admin wilayah hanya membaca dan mengubah DN wilayahnya', () => {
    const timur = { role: 'superadmin', dealerNightIds: ['manado', 'kupang'], wilayah: 'Indonesia Timur' } as const;
    expect(canReadDealerNight(timur, 'manado')).toBe(true);
    expect(canAdjustTarget(timur, 'kupang')).toBe(true);
    expect(canReadDealerNight(timur, 'bogor')).toBe(false);
    expect(canAdjustTarget(timur, 'bogor')).toBe(false);
    expect(superAdminPusat(timur)).toBe(false);
    expect(superAdminPusat({ role: 'superadmin', wilayah: null })).toBe(true);
    expect(superAdminPusat({ role: 'admin', wilayah: null })).toBe(false);
  });

  it('label cakupan superadmin memakai wilayah, bukan daftar DN lama di DB', () => {
    const opsi = [{ id: 'bogor', name: 'DN Bogor' }];
    expect(cakupanDnAkun({ role: 'superadmin', dealerNightIds: ['bogor'], wilayah: null }, opsi)).toEqual({ semua: 'Semua Dealer Night' });
    expect(cakupanDnAkun({ role: 'superadmin', dealerNightIds: null, wilayah: 'Indonesia Timur' }, opsi))
      .toEqual({ semua: 'Semua DN Indonesia Timur' });
    expect(cakupanDnAkun({ role: 'admin', dealerNightIds: ['bogor'] }, opsi)).toEqual({ nama: ['DN Bogor'] });
  });

  it.each(['marketing', 'management'] as const)('%s is read-only', (role) => {
    expect(canReadDealerNight({ role, dealerNightIds: null }, 'bogor')).toBe(true);
    expect(canAdjustTarget({ role, dealerNightIds: null }, 'bogor')).toBe(false);
  });

  it('rejects an account without any Dealer Night', () => {
    const user = { role: 'dn_user', dealerNightIds: [] } as const;
    expect(canReadDealerNight(user, 'bogor')).toBe(false);
    expect(canAdjustTarget(user, 'bogor')).toBe(false);
  });
});
