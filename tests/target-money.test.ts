import { describe, expect, it } from 'vitest';
import { formatRupiah, formatRupiahRingkas } from '@/lib/target/money';
import { validateTargetDn } from '@/lib/target/rules';

describe('Target DN money', () => {
  it('formats compact values with exactly one decimal', () => {
    expect(formatRupiahRingkas(5_619_000_000)).toBe('Rp5,6 M');
    expect(formatRupiahRingkas(3_000_000_000)).toBe('Rp3,0 M');
    expect(formatRupiahRingkas(820_000_000)).toBe('Rp820,0 jt');
    expect(formatRupiahRingkas(-250_000_000)).toBe('Rp-250,0 jt');
    expect(formatRupiah(820_000_000)).toBe('Rp820.000.000');
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
