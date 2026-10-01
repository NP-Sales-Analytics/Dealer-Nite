import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { aksesSemuaDealerNight } from '@/lib/access';
import type { SessionUser } from '@/lib/auth';
import { depotPerKode } from '@/lib/dashboard/hierarchy';
import { db } from '@/lib/db';
import { customers, dealerNights } from '@/lib/db/schema';

export type DepotDn = { kode: string; depot: string };

/**
 * Depot milik tiap DN: daftar resmi pelaksanaan DN digabung depot yang benar-
 * benar ada di master tokonya, supaya tidak ada depot yang hilang dari pilihan.
 */
export async function depotDealerNight(
  rows: { id: string; depotCodes: string[] | null }[],
): Promise<Map<string, DepotDn[]>> {
  const hasil = new Map<string, Map<string, string>>(rows.map((row) => [row.id, new Map()]));
  const resmi = depotPerKode();
  for (const row of rows) {
    for (const kode of row.depotCodes ?? []) {
      const depot = resmi.get(kode);
      if (depot) hasil.get(row.id)!.set(kode, depot.depot);
    }
  }
  if (rows.length > 0) {
    const dariMaster = await db
      .selectDistinct({ dn: customers.dealerNightId, kode: customers.depotCode, depot: customers.depotName })
      .from(customers)
      .where(inArray(customers.dealerNightId, rows.map((row) => row.id)));
    for (const row of dariMaster) hasil.get(row.dn)?.set(row.kode, row.depot);
  }
  return new Map([...hasil].map(([id, peta]) => [
    id,
    [...peta].map(([kode, depot]) => ({ kode, depot })).sort((a, b) => a.depot.localeCompare(b.depot, 'id')),
  ]));
}

/** Dealer Night aktif yang boleh dilihat user, urut tanggal acara. */
export async function dealerNightOptionsFor(user: SessionUser) {
  if (!aksesSemuaDealerNight(user) && user.dealerNightIds!.length === 0) return [];
  const active = eq(dealerNights.active, true);
  const rows = await db
    .select({
      id: dealerNights.id,
      name: dealerNights.name,
      targetPax: dealerNights.targetPax,
      targetDn: dealerNights.targetDn,
      eventDate: dealerNights.eventDate,
      depotCodes: dealerNights.depotCodes,
    })
    .from(dealerNights)
    .where(aksesSemuaDealerNight(user) ? active : and(active, inArray(dealerNights.id, user.dealerNightIds!)))
    .orderBy(sql`${dealerNights.eventDate} is null`, asc(dealerNights.eventDate), asc(dealerNights.name));
  const depots = await depotDealerNight(rows);
  return rows.map((row) => ({
    id: row.id, name: row.name, targetPax: row.targetPax, targetDn: row.targetDn, eventDate: row.eventDate, depots: depots.get(row.id) ?? [],
  }));
}

/** Depot satu DN; kosong bila DN tidak ada. */
export async function depotSatuDn(dealerNightId: string): Promise<DepotDn[]> {
  const rows = await db.select({ id: dealerNights.id, depotCodes: dealerNights.depotCodes })
    .from(dealerNights).where(eq(dealerNights.id, dealerNightId)).limit(1);
  return (await depotDealerNight(rows)).get(dealerNightId) ?? [];
}
