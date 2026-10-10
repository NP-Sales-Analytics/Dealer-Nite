import { z } from 'zod';
import { BATAS_BAWAH_TARGET } from '@/lib/target/rules';

export const targetPaxItemSchema = z.object({
  dealerNightId: z.string().trim().min(1).max(36),
  targetPax: z.number().int().min(0).max(1_000_000),
  targetDn: z.number().int().safe().min(0),
  minTargetDn: z.number().int().safe().min(BATAS_BAWAH_TARGET),
  // Nilai target per satu kupon (slot besar/kecil). Minimal Rp1 juta supaya
  // salah ketik (mis. 75 alih-alih 75.000.000) tidak meledakkan jumlah kupon.
  nilaiKuponPink: z.number().int().safe().min(1_000_000),
  nilaiKuponHijau: z.number().int().safe().min(1_000_000),
}).strict();

export const targetPaxListSchema = z.array(targetPaxItemSchema).min(1).max(100)
  .refine((items) => new Set(items.map((item) => item.dealerNightId)).size === items.length, {
    message: 'Dealer Night tidak boleh dikirim dua kali.',
  });

export type TargetPaxItem = z.infer<typeof targetPaxItemSchema>;
