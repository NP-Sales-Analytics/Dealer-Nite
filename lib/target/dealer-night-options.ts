import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { aksesSemuaDealerNight, bolehDepot } from '@/lib/access';
import type { SessionUser } from '@/lib/auth';
import { depotPerKode } from '@/lib/dashboard/hierarchy';
import { db } from '@/lib/db';
import { appSettings, customers, dealerNights } from '@/lib/db/schema';
import { pilihDnAwal, WILAYAH, type DnAwalPerWilayah, type Wilayah } from '@/lib/target/dn-bawaan';
import { ttlCache } from '@/lib/ttl-cache';

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

const kunciDnAwal = (wilayah: Wilayah) => `dn_tampilan_awal:${wilayah}`;

/** DN tampilan awal per wilayah pilihan Super Admin; null = otomatis (DN terdekat). */
export async function dnTampilanAwal(): Promise<DnAwalPerWilayah> {
  const rows = await db.select({ key: appSettings.key, value: appSettings.value }).from(appSettings)
    .where(inArray(appSettings.key, WILAYAH.map(kunciDnAwal)));
  const nilai = new Map(rows.map((row) => [row.key, row.value]));
  return Object.fromEntries(WILAYAH.map((w) => [w, nilai.get(kunciDnAwal(w)) || null])) as DnAwalPerWilayah;
}

export async function aturDnTampilanAwal(wilayah: Wilayah, dealerNightId: string | null) {
  const key = kunciDnAwal(wilayah);
  if (!dealerNightId) {
    await db.delete(appSettings).where(eq(appSettings.key, key));
    return;
  }
  await db.insert(appSettings).values({ key, value: dealerNightId })
    .onDuplicateKeyUpdate({ set: { value: dealerNightId } });
}

/** Wilayah sebuah DN, dari hierarki depot-depotnya. */
export const wilayahDn = (depots: DepotDn[]): string | null => {
  const hierarki = depotPerKode();
  return depots.map((item) => hierarki.get(item.kode)?.wilayah).find(Boolean) ?? null;
};

/** Semua DN (aktif maupun tidak) di satu wilayah: cakupan Super Admin wilayah. */
export const dnIdsWilayah = ttlCache(async (wilayah: string) => {
  const rows = await db.select({ id: dealerNights.id, depotCodes: dealerNights.depotCodes }).from(dealerNights);
  const depots = await depotDealerNight(rows);
  return rows.filter((row) => wilayahDn(depots.get(row.id) ?? []) === wilayah).map((row) => row.id);
}, 60_000);

/** Dealer Night aktif yang boleh dilihat user, urut tanggal acara. */
export async function dealerNightOptionsFor(user: SessionUser) {
  if (!aksesSemuaDealerNight(user) && user.dealerNightIds!.length === 0) return [];
  const active = eq(dealerNights.active, true);
  const awalPromise = dnTampilanAwal();
  const rows = await db
    .select({
      id: dealerNights.id,
      name: dealerNights.name,
      targetPax: dealerNights.targetPax,
      targetDn: dealerNights.targetDn,
      minTargetDn: dealerNights.minTargetDn,
      eventDate: dealerNights.eventDate,
      depotCodes: dealerNights.depotCodes,
      kuponSkema: dealerNights.kuponSkema,
      nilaiKuponPink: dealerNights.nilaiKuponPink,
      nilaiKuponHijau: dealerNights.nilaiKuponHijau,
    })
    .from(dealerNights)
    .where(aksesSemuaDealerNight(user) ? active : and(active, inArray(dealerNights.id, user.dealerNightIds!)))
    .orderBy(sql`${dealerNights.eventDate} is null`, asc(dealerNights.eventDate), asc(dealerNights.name));
  const [depots, awal] = await Promise.all([depotDealerNight(rows), awalPromise]);
  const options = rows.map((row) => ({
    id: row.id, name: row.name, targetPax: row.targetPax, targetDn: row.targetDn, minTargetDn: row.minTargetDn,
    eventDate: row.eventDate,
    wilayah: wilayahDn(depots.get(row.id) ?? []),
    kupon: { skema: row.kuponSkema, nilai: { pink: row.nilaiKuponPink, hijau: row.nilaiKuponHijau } },
    depots: (depots.get(row.id) ?? []).filter((item) => bolehDepot(user, item.kode)),
  }));
  const dipilih = pilihDnAwal(options, awal);
  return options.map((item) => ({ ...item, bawaan: item.id === dipilih }));
}

/** Depot satu DN; kosong bila DN tidak ada. */
export async function depotSatuDn(dealerNightId: string): Promise<DepotDn[]> {
  const rows = await db.select({ id: dealerNights.id, depotCodes: dealerNights.depotCodes })
    .from(dealerNights).where(eq(dealerNights.id, dealerNightId)).limit(1);
  return (await depotDealerNight(rows)).get(dealerNightId) ?? [];
}
