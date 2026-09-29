import { z } from 'zod';
import { MIN_TARGET_DN } from '@/lib/target/rules';

export const targetAdjustmentSchema = z.object({
  customerId: z.string().uuid(),
  newTarget: z.number()
    .int('Target DN harus berupa bilangan bulat rupiah.')
    .safe('Target DN di luar rentang angka yang aman.')
    .min(MIN_TARGET_DN, 'Target DN minimal Rp50.000.000.'),
  note: z.string().trim().max(1000).optional(),
});

export type TargetAdjustmentInput = z.infer<typeof targetAdjustmentSchema>;
