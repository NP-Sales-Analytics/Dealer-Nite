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
    // Nama disamakan jadi huruf besar sejak validasi, bukan di UI: POST dan
    // PATCH sama-sama lewat sini, jadi tidak ada jalur yang terlewat.
    manualNamaCustomer: z.string().trim().min(2).max(200).transform((v) => v.toUpperCase()),
    manualDepot: z.string().trim().min(1).max(100),
    qtyHadir,
  }).strict(),
]);

export type ReservationInput = z.infer<typeof reservationInputSchema>;

// Setelah catatan tersimpan hanya jumlah hadir yang boleh dikoreksi. Depot dan
// identitas selalu mengikuti sumber saat pencatatan/master customer.
export const reservationPatchSchema = z.object({
  qtyHadir,
}).strict();

export type ReservationPatch = z.infer<typeof reservationPatchSchema>;
