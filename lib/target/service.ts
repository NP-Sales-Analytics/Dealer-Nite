import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { targetAdjustments } from '@/lib/db/schema';
import { MIN_TARGET_DN, validateTargetDn } from '@/lib/target/rules';

export type TargetSnapshot = {
  customerId: string;
  targetAwal: number;
  targetEfektif: number;
  delta: number;
};

export type TargetListRow = TargetSnapshot & {
  dealerNightId: string;
  mgCode: string;
  mgName: string;
  sotpCode: string;
  sotpName: string;
  depotCode: string;
  depotName: string;
  wilayah: string | null;
  region: string | null;
  salesman: string | null;
  spv: string | null;
  jumlahPenyesuaian: number;
  lastAdjustedAt: string | null;
  verifiedAt: string | null;
  verifiedByName: string | null;
  targetVerifikasi: number | null;
  qtyHadir: number | null;
  nomorUndian: string | null;
  checkedInAt: string | null;
};

const teksAtauNull = (value: unknown) => (value == null ? null : String(value));
const isoAtauNull = (value: unknown) => (value == null
  ? null
  : (value instanceof Date ? value : new Date(String(value))).toISOString());

export class TargetServiceError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'BELOW_MINIMUM' | 'INVALID_TARGET') {
    super(code === 'NOT_FOUND' ? 'Toko tidak ditemukan.' : code === 'BELOW_MINIMUM'
      ? 'Target DN minimal Rp50.000.000.'
      : 'Target DN tidak valid.');
    this.name = 'TargetServiceError';
  }
}

type CustomerRow = { id: string; dealerNightId: string; targetAwal: number | string; verifiedAt: unknown };
type SumRow = { totalDelta: number | string | null };

function rowsFrom<T>(result: unknown): T[] {
  return (result as [T[], unknown])[0];
}

function checkedTarget(value: number) {
  try {
    return validateTargetDn(value);
  } catch {
    if (Number.isSafeInteger(value) && value < MIN_TARGET_DN) {
      throw new TargetServiceError('BELOW_MINIMUM');
    }
    throw new TargetServiceError('INVALID_TARGET');
  }
}

export async function adjustTarget({
  customerId,
  newTarget,
  actorId,
  note,
}: {
  customerId: string;
  newTarget: number;
  actorId: string;
  note?: string;
}): Promise<TargetSnapshot> {
  checkedTarget(newTarget);

  return db.transaction(async (tx) => {
    const customerRows = rowsFrom<CustomerRow>(await tx.execute(sql`
      select id, dealer_night_id as dealerNightId, target_dn_awal as targetAwal, verified_at as verifiedAt
      from customers
      where id = ${customerId}
      for update
    `));
    const customer = customerRows[0];
    if (!customer) throw new TargetServiceError('NOT_FOUND');

    const sumRows = rowsFrom<SumRow>(await tx.execute(sql`
      select coalesce(sum(delta), 0) as totalDelta
      from target_adjustments
      where customer_id = ${customerId}
    `));
    const targetAwal = Number(customer.targetAwal);
    const targetEfektifSebelum = targetAwal + Number(sumRows[0]?.totalDelta ?? 0);
    const delta = newTarget - targetEfektifSebelum;

    // Submit pertama oleh admin DN = verifikasi, walaupun nilainya sama.
    // Nilainya dibekukan di target_verifikasi sebagai dasar kupon yang dicetak.
    const verifikasi = customer.verifiedAt == null;
    if (delta !== 0) {
      await tx.insert(targetAdjustments).values({
        id: randomUUID(),
        customerId,
        delta,
        jenis: verifikasi ? 'verifikasi' : 'penyesuaian',
        note: note?.trim() || null,
        recordedBy: actorId,
      });
    }
    if (verifikasi) {
      await tx.execute(sql`
        update customers
        set verified_at = current_timestamp(3), verified_by = ${actorId}, target_verifikasi = ${newTarget}
        where id = ${customerId}
      `);
    }

    return { customerId, targetAwal, targetEfektif: newTarget, delta };
  });
}

export async function getTargetSnapshot(customerId: string): Promise<TargetSnapshot> {
  const rows = rowsFrom<{ customerId: string; targetAwal: number | string; totalDelta: number | string }>(
    await db.execute(sql`
      select c.id as customerId, c.target_dn_awal as targetAwal,
        coalesce(sum(a.delta), 0) as totalDelta
      from customers c
      left join target_adjustments a on a.customer_id = c.id
      where c.id = ${customerId}
      group by c.id, c.target_dn_awal
    `),
  );
  const row = rows[0];
  if (!row) throw new TargetServiceError('NOT_FOUND');
  const targetAwal = Number(row.targetAwal);
  const targetEfektif = targetAwal + Number(row.totalDelta);
  return { customerId: row.customerId, targetAwal, targetEfektif, delta: targetEfektif - targetAwal };
}

export async function getCustomerScope(customerId: string): Promise<{ dealerNightId: string; depotCode: string } | null> {
  const rows = rowsFrom<{ dealerNightId: string; depotCode: string }>(await db.execute(sql`
    select dealer_night_id as dealerNightId, depot_code as depotCode from customers where id = ${customerId} limit 1
  `));
  return rows[0] ? { dealerNightId: String(rows[0].dealerNightId), depotCode: String(rows[0].depotCode) } : null;
}

export async function getCustomerDealerNightId(customerId: string): Promise<string | null> {
  const rows = rowsFrom<{ dealerNightId: string }>(await db.execute(sql`
    select dealer_night_id as dealerNightId from customers where id = ${customerId} limit 1
  `));
  return rows[0]?.dealerNightId ?? null;
}

export async function listTargets(dealerNightId: string): Promise<TargetListRow[]> {
  const rows = rowsFrom<Record<string, unknown>>(await db.execute(sql`
    select c.id as customerId, c.dealer_night_id as dealerNightId,
      c.mg_code as mgCode, c.mg_name as mgName, c.sotp_code as sotpCode, c.sotp_name as sotpName,
      c.depot_code as depotCode, c.depot_name as depotName, c.wilayah, c.region,
      c.salesman, c.spv, c.target_dn_awal as targetAwal,
      c.target_dn_awal + coalesce(a.total, 0) as targetEfektif,
      coalesce(a.total, 0) as delta, coalesce(a.jumlah, 0) as jumlahPenyesuaian,
      a.terakhir as lastAdjustedAt, c.verified_at as verifiedAt, p.full_name as verifiedByName,
      c.target_verifikasi as targetVerifikasi,
      r.qty_hadir as qtyHadir, r.nomor_undian as nomorUndian, r.checked_in_at as checkedInAt
    from customers c
    left join (
      select t.customer_id, sum(t.delta) as total, sum(t.jenis = 'penyesuaian') as jumlah, max(t.created_at) as terakhir
      from target_adjustments t
      join customers c2 on c2.id = t.customer_id
      where c2.dealer_night_id = ${dealerNightId}
      group by t.customer_id
    ) a on a.customer_id = c.id
    left join profiles p on p.id = c.verified_by
    left join reservations r on r.customer_id = c.id
    where c.dealer_night_id = ${dealerNightId}
    order by targetEfektif desc, lastAdjustedAt asc, c.mg_name asc
  `));

  return rows.map((row) => ({
    customerId: String(row.customerId),
    dealerNightId: String(row.dealerNightId),
    mgCode: String(row.mgCode),
    mgName: String(row.mgName),
    sotpCode: String(row.sotpCode),
    sotpName: String(row.sotpName),
    depotCode: String(row.depotCode),
    depotName: String(row.depotName),
    wilayah: teksAtauNull(row.wilayah),
    region: teksAtauNull(row.region),
    salesman: teksAtauNull(row.salesman),
    spv: teksAtauNull(row.spv),
    targetAwal: Number(row.targetAwal),
    targetEfektif: Number(row.targetEfektif),
    delta: Number(row.delta),
    jumlahPenyesuaian: Number(row.jumlahPenyesuaian),
    lastAdjustedAt: isoAtauNull(row.lastAdjustedAt),
    verifiedAt: isoAtauNull(row.verifiedAt),
    verifiedByName: teksAtauNull(row.verifiedByName),
    targetVerifikasi: row.targetVerifikasi == null ? null : Number(row.targetVerifikasi),
    qtyHadir: row.qtyHadir == null ? null : Number(row.qtyHadir),
    nomorUndian: teksAtauNull(row.nomorUndian),
    checkedInAt: isoAtauNull(row.checkedInAt),
  }));
}

export async function getTargetHistory(customerId: string) {
  const rows = rowsFrom<Record<string, unknown>>(await db.execute(sql`
    select a.id, a.customer_id as customerId, a.delta, a.jenis, a.note,
      a.recorded_by as recordedBy, p.full_name as recordedByName, a.created_at as createdAt
    from target_adjustments a
    left join profiles p on p.id = a.recorded_by
    where a.customer_id = ${customerId}
    order by a.created_at desc, a.id desc
  `));
  return rows.map((row) => ({
    id: String(row.id),
    customerId: String(row.customerId),
    delta: Number(row.delta),
    jenis: String(row.jenis) as 'verifikasi' | 'penyesuaian',
    note: row.note == null ? null : String(row.note),
    recordedBy: row.recordedBy == null ? null : String(row.recordedBy),
    recordedByName: row.recordedByName == null ? null : String(row.recordedByName),
    createdAt: new Date(String(row.createdAt)),
  }));
}

/**
 * Mengembalikan toko ke tahap awal (target pusat): seluruh penyesuaian,
 * status verifikasi, dan catatan kupon toko itu dihapus. Dipakai untuk uji coba.
 */
export async function resetVerifikasi(customerId: string) {
  await db.transaction(async (tx) => {
    const rows = rowsFrom<{ id: string }>(await tx.execute(sql`select id from customers where id = ${customerId} for update`));
    if (!rows[0]) throw new TargetServiceError('NOT_FOUND');
    await tx.execute(sql`delete from target_adjustments where customer_id = ${customerId}`);
    await tx.execute(sql`delete from kupon_proses where customer_id = ${customerId}`);
    await tx.execute(sql`
      update customers set verified_at = null, verified_by = null, target_verifikasi = null where id = ${customerId}
    `);
  });
}
