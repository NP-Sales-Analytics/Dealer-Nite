import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { customers, reservations } from '@/lib/db/schema';

/** Nama toko pemegang nomor undian ini di Dealer Night yang sama, atau null. */
export async function pemegangUndian(
  dealerNightId: string,
  nomorUndian: string,
  kecualiReservationId?: string,
): Promise<string | null> {
  const [row] = await db
    .select({ nama: customers.mgName, manual: reservations.manualNamaCustomer })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .where(and(
      eq(reservations.dealerNightId, dealerNightId),
      eq(reservations.nomorUndian, nomorUndian),
      kecualiReservationId ? ne(reservations.id, kecualiReservationId) : undefined,
    ))
    .limit(1);
  return row ? (row.nama ?? row.manual ?? 'toko lain') : null;
}

export const undianDipakaiBody = (nomorUndian: string, nama: string) => ({
  code: 'NOMOR_UNDIAN_DIPAKAI',
  error: `Nomor undian ${nomorUndian} sudah dipakai oleh ${nama}.`,
});

export const isDupUndian = (error: unknown) => {
  const cause = (error as { cause?: { code?: string; sqlMessage?: string } }).cause;
  return cause?.code === 'ER_DUP_ENTRY' && !!cause.sqlMessage?.includes('reservations_dn_undian_unique');
};
