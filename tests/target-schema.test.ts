import { describe, expect, it } from 'vitest';
import { targetAdjustmentSchema } from '@/lib/validations/target';

describe('targetAdjustmentSchema', () => {
  const customerId = '11111111-1111-4111-8111-111111111111';

  it('accepts an absolute Target DN at the minimum', () => {
    expect(targetAdjustmentSchema.parse({ customerId, newTarget: 50_000_000 })).toEqual({
      customerId,
      newTarget: 50_000_000,
    });
  });

  // Minimal per DN dicek di adjustTarget; schema hanya menjaga batas bawah global Rp1 juta.
  it('rejects values below Rp1 million, fractional, or unsafe', () => {
    expect(() => targetAdjustmentSchema.parse({ customerId, newTarget: 999_999 })).toThrow();
    expect(targetAdjustmentSchema.parse({ customerId, newTarget: 25_000_000 }).newTarget).toBe(25_000_000);
    expect(() => targetAdjustmentSchema.parse({ customerId, newTarget: 50_000_000.5 })).toThrow();
    expect(() => targetAdjustmentSchema.parse({ customerId, newTarget: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
  });

  it('rejects an invalid customer id', () => {
    expect(() => targetAdjustmentSchema.parse({ customerId: 'not-an-id', newTarget: 50_000_000 })).toThrow();
  });
});
