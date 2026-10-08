import { describe, expect, it } from 'vitest';
import { bolehDepot, cakupanDepot, labelDealerNightAccess } from '@/lib/access';
import { batasiFilterDepot } from '@/lib/depot-scope';

const filter = { wilayah: [], region: [], depot: [], statusPax: [], q: null, kodeSap: null };

describe('Akses per depot', () => {
  it('tanpa depot berarti semua depot di DN', () => {
    expect(cakupanDepot({ role: 'admin', depotCodes: null })).toBeNull();
    expect(cakupanDepot({ role: 'admin', depotCodes: [] })).toBeNull();
    expect(bolehDepot({ role: 'admin', depotCodes: null }, '5C')).toBe(true);
  });

  it('membatasi ke depot terpilih, superadmin tidak pernah dibatasi', () => {
    expect(bolehDepot({ role: 'admin', depotCodes: ['1S'] }, '1S')).toBe(true);
    expect(bolehDepot({ role: 'admin', depotCodes: ['1S'] }, '5C')).toBe(false);
    expect(bolehDepot({ role: 'superadmin', depotCodes: ['1S'] }, '5C')).toBe(true);
  });

  it('filter dashboard hanya menyempit, tidak melebar', () => {
    const user = { role: 'admin' as const, depotCodes: ['1S'] };
    expect(batasiFilterDepot(user, filter).depot).toEqual(['1S Bogor']);
    expect(batasiFilterDepot(user, { ...filter, depot: ['1S Bogor', '5C Cianjur'] }).depot).toEqual(['1S Bogor']);
    // Meminta depot lain tidak boleh berubah jadi "semua depot".
    expect(batasiFilterDepot(user, { ...filter, depot: ['5C Cianjur'] }).depot).toHaveLength(1);
    expect(batasiFilterDepot(user, { ...filter, depot: ['5C Cianjur'] }).depot[0]).not.toBe('5C Cianjur');
    expect(batasiFilterDepot({ role: 'admin', depotCodes: null }, filter)).toBe(filter);
  });

  it('label user menyebut DN dan depotnya', () => {
    const options = [{ id: 'bogor', name: 'DN Bogor', depots: [{ kode: '1S', depot: '1S Bogor' }, { kode: '5C', depot: '5C Cianjur' }] }];
    expect(labelDealerNightAccess({ role: 'admin', dealerNightIds: ['bogor'], depotCodes: ['5C'] }, options)).toBe('DN Bogor · 5C Cianjur');
    expect(labelDealerNightAccess({ role: 'admin', dealerNightIds: ['bogor'], depotCodes: null }, options)).toBe('DN Bogor');
  });
});
