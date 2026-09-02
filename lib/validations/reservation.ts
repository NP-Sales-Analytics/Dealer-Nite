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
