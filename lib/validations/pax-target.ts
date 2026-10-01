import { z } from 'zod';

export const targetPaxItemSchema = z.object({
  dealerNightId: z.string().trim().min(1).max(36),
  targetPax: z.number().int().min(0).max(1_000_000),
  targetDn: z.number().int().safe().min(0),
}).strict();

export const targetPaxListSchema = z.array(targetPaxItemSchema).min(1).max(100)
  .refine((items) => new Set(items.map((item) => item.dealerNightId)).size === items.length, {
    message: 'Dealer Night tidak boleh dikirim dua kali.',
  });

export type TargetPaxItem = z.infer<typeof targetPaxItemSchema>;
