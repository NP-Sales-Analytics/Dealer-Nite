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

  it('rejects values below Rp50 million, fractional, or unsafe', () => {
    expect(() => targetAdjustmentSchema.parse({ customerId, newTarget: 49_999_999 })).toThrow();
    expect(() => targetAdjustmentSchema.parse({ customerId, newTarget: 50_000_000.5 })).toThrow();
    expect(() => targetAdjustmentSchema.parse({ customerId, newTarget: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
  });

  it('rejects an invalid customer id', () => {
    expect(() => targetAdjustmentSchema.parse({ customerId: 'not-an-id', newTarget: 50_000_000 })).toThrow();
  });
});
