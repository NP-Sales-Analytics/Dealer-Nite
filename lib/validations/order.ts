import { z } from 'zod';

// qtyChange boleh negatif (pengurangan) tapi bukan nol; batas wajar sekali klik.
// customerId hanya dipakai jalur staff (mencatat atas nama toko); untuk sesi
// customer, id diambil dari sesi dan field ini diabaikan.
export const orderAdjustSchema = z.object({
  qtyChange: z.number().int().refine((n) => n !== 0, 'Tidak boleh nol').min(-1000).max(1000),
  customerId: z.uuid().optional(),
}).strict();

export type OrderAdjustInput = z.infer<typeof orderAdjustSchema>;
