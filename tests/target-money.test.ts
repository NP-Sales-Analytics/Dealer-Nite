import { describe, expect, it } from 'vitest';
import { formatRupiah, formatRupiahRingkas } from '@/lib/target/money';
import { validateTargetDn } from '@/lib/target/rules';

describe('Target DN money', () => {
  it('formats compact target values without wasting space', () => {
    expect(formatRupiahRingkas(5_619_000_000)).toBe('Rp5,62 M');
    expect(formatRupiahRingkas(820_000_000)).toBe('Rp820 jt');
    expect(formatRupiah(820_000_000)).toBe('Rp820.000.000');
  });

  it('keeps useful decimals and removes trailing zeroes', () => {
    expect(formatRupiahRingkas(1_500_000_000)).toBe('Rp1,5 M');
    expect(formatRupiahRingkas(53_000_000)).toBe('Rp53 jt');
  });

  it('accepts 50 million and rejects anything lower', () => {
    expect(validateTargetDn(50_000_000)).toBe(50_000_000);
    expect(() => validateTargetDn(49_999_999)).toThrow('minimal Rp50.000.000');
  });

  it('rejects unsafe or fractional rupiah values', () => {
    expect(() => validateTargetDn(Number.MAX_SAFE_INTEGER + 1)).toThrow('bilangan bulat aman');
    expect(() => validateTargetDn(50_000_000.5)).toThrow('bilangan bulat aman');
  });
});
