import { z } from 'zod';
import { MAKS_SEKALI, MAKS_TOTAL } from '@/lib/order/aturan';

// qtyChange boleh negatif (pengurangan) tapi bukan nol.
//
// Batasnya MENGAMBIL dari MAKS_SEKALI, tidak ditulis ulang sebagai angka.
// Dulu di sini tertulis 1.000 sementara layar menjanjikan 10.000, jadi
// penambahan 2.000 lolos seluruh pemeriksaan klien lalu ditolak diam-diam di
// sini sebagai "INVALID" - kegagalan yang tidak bisa dijelaskan kepada siapa
// pun. Satu konstanta, satu janji.
//
// customerId hanya dipakai jalur staff (mencatat atas nama toko); untuk sesi
// customer, id diambil dari sesi dan field ini diabaikan.
export const orderAdjustSchema = z.object({
  qtyChange: z
    .number()
    .int()
    .refine((n) => n !== 0, 'Tidak boleh nol')
    .min(-MAKS_SEKALI)
    .max(MAKS_SEKALI),
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
  total: z.number().int().min(0).max(MAKS_TOTAL).optional(),
}).strict();

export type OrderCustomerPatch = z.infer<typeof orderCustomerPatchSchema>;
