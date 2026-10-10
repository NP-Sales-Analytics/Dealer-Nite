import { z } from 'zod';
import { BATAS_BAWAH_TARGET, pesanTargetMinimal } from '@/lib/target/rules';

export const targetAdjustmentSchema = z.object({
  customerId: z.string().uuid(),
  // Minimal per DN dicek di adjustTarget (butuh DN toko); di sini batas bawah global.
  newTarget: z.number()
    .int('Target DN harus berupa bilangan bulat rupiah.')
    .safe('Target DN di luar rentang angka yang aman.')
    .min(BATAS_BAWAH_TARGET, pesanTargetMinimal(BATAS_BAWAH_TARGET)),
  note: z.string().trim().max(1000).optional(),
});

export type TargetAdjustmentInput = z.infer<typeof targetAdjustmentSchema>;
