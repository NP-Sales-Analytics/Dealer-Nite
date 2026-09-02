import { z } from 'zod';

const qtyHadir = z.number().int().min(0).max(1000);

export const reservationInputSchema = z.discriminatedUnion('isManualEntry', [
  z.object({
    isManualEntry: z.literal(false),
    customerId: z.uuid(),
    qtyHadir,
    confirmOverwrite: z.boolean().optional(),
    confirmOverQuota: z.boolean().optional(),
  }).strict(),
  z.object({
    isManualEntry: z.literal(true),
    manualNamaCustomer: z.string().trim().min(2).max(200),
    manualDepot: z.string().trim().min(1).max(100),
    qtyHadir,
  }).strict(),
]);

export type ReservationInput = z.infer<typeof reservationInputSchema>;

// Perubahan catatan kehadiran yang sudah tersimpan. Semua field opsional supaya
// UI bisa mengirim hanya yang berubah. depotOverride null = kembali mengikuti
// depot master data.
export const reservationPatchSchema = z.object({
  qtyHadir: z.number().int().min(0).max(1000).optional(),
  depotOverride: z.string().trim().min(1).max(100).nullable().optional(),
  manualNamaCustomer: z.string().trim().min(2).max(200).optional(),
}).strict();

export type ReservationPatch = z.infer<typeof reservationPatchSchema>;
