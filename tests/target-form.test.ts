import { describe, expect, it } from 'vitest';
import { buildTargetAdjustment, parseRupiahInput, targetFormCopy } from '@/lib/target/form';

describe('Target DN form', () => {
  it.each(['900.000.000', 'Rp 900.000.000', '900000000'])(
    'normalizes %s to integer rupiah',
    (input) => expect(parseRupiahInput(input)).toBe(900_000_000),
  );

  it('builds an absolute-target request and rejects below-minimum values', () => {
    expect(buildTargetAdjustment('customer-1', '900.000.000')).toEqual({
      customerId: 'customer-1',
      newTarget: 900_000_000,
    });
    expect(() => buildTargetAdjustment('customer-1', '49.999.999')).toThrow(
      'minimal Rp50.000.000',
    );
  });

  it('uses Target DN copy rather than old order units', () => {
    const copy = targetFormCopy({ currentTarget: 820_000_000 });
    expect(copy.current).toContain('Rp820.000.000');
    expect(JSON.stringify(copy)).not.toMatch(/dus|Tambah Order/i);
  });
});
