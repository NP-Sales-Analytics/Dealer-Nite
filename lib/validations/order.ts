import { z } from 'zod';

export const orderLoginSchema = z.object({
  kodeSap: z.string().trim().min(1).max(50),
}).strict();

// qtyChange boleh negatif (pengurangan) tapi bukan nol; batas wajar sekali klik.
export const orderAdjustSchema = z.object({
  qtyChange: z.number().int().refine((n) => n !== 0, 'Tidak boleh nol').min(-1000).max(1000),
}).strict();

export type OrderAdjustInput = z.infer<typeof orderAdjustSchema>;
