import { z } from 'zod';

const qtyHadir = z.number().int().min(0).max(1000);
// Disimpan sebagai teks supaya nol di depan ("007") tidak hilang.
export const nomorUndianSchema = z.string().trim().regex(/^\d{1,20}$/, 'Nomor undian harus berupa angka.');
const depot = z.string().trim().min(1).max(100);

export const reservationInputSchema = z.discriminatedUnion('isManualEntry', [
  z.object({
    isManualEntry: z.literal(false),
    customerId: z.uuid(),
    qtyHadir,
    nomorUndian: nomorUndianSchema,
    confirmOverwrite: z.boolean().optional(),
  }).strict(),
  z.object({
    isManualEntry: z.literal(true),
    // Nama disamakan jadi huruf besar sejak validasi, bukan di UI: POST dan
    // PATCH sama-sama lewat sini, jadi tidak ada jalur yang terlewat.
    manualNamaCustomer: z.string().trim().min(2).max(200).transform((v) => v.toUpperCase()),
    manualDepot: depot,
    qtyHadir,
    nomorUndian: nomorUndianSchema,
  }).strict(),
]);

export type ReservationInput = z.infer<typeof reservationInputSchema>;

// Depot hanya boleh dikoreksi untuk tamu manual; customer terdaftar mengikuti
// master. Route PATCH menolak manualDepot untuk catatan non-manual.
export const reservationPatchSchema = z.object({
  qtyHadir,
  nomorUndian: nomorUndianSchema,
  manualDepot: depot.optional(),
}).strict();

export type ReservationPatch = z.infer<typeof reservationPatchSchema>;
