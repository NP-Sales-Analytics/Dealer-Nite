import { z } from 'zod';

// qtyChange boleh negatif (pengurangan) tapi bukan nol; batas wajar sekali klik.
// customerId hanya dipakai jalur staff (mencatat atas nama toko); untuk sesi
// customer, id diambil dari sesi dan field ini diabaikan.
export const orderAdjustSchema = z.object({
  qtyChange: z.number().int().refine((n) => n !== 0, 'Tidak boleh nol').min(-1000).max(1000),
  customerId: z.uuid().optional(),
}).strict();

export type OrderAdjustInput = z.infer<typeof orderAdjustSchema>;

/**
 * Perubahan dari halaman Detail Order (admin). Semua opsional supaya UI bisa
 * mengirim hanya yang berubah. `total` bersifat absolut - selisihnya terhadap
 * catatan sekarang yang ditulis ke ledger, jadi riwayatnya tetap utuh.
 */
export const orderCustomerPatchSchema = z.object({
  namaToko: z.string().trim().min(2).max(200).transform((v) => v.toUpperCase()).optional(),
  depot: z.string().trim().min(1).max(100).optional(),
  total: z.number().int().min(0).max(100000).optional(),
}).strict();

export type OrderCustomerPatch = z.infer<typeof orderCustomerPatchSchema>;
