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
  depotCode: string;
  depotName: string;
  salesman: string | null;
  spv: string | null;
  lastAdjustedAt: Date | null;
};

export class TargetServiceError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'BELOW_MINIMUM' | 'INVALID_TARGET') {
    super(code === 'NOT_FOUND' ? 'Toko tidak ditemukan.' : code === 'BELOW_MINIMUM'
      ? 'Target DN minimal Rp50.000.000.'
      : 'Target DN tidak valid.');
    this.name = 'TargetServiceError';
  }
}

type CustomerRow = { id: string; dealerNightId: string; targetAwal: number | string };
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
      select id, dealer_night_id as dealerNightId, target_dn_awal as targetAwal
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

    if (delta !== 0) {
      await tx.insert(targetAdjustments).values({
        id: randomUUID(),
        customerId,
        delta,
        note: note?.trim() || null,
        recordedBy: actorId,
      });
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

export async function getCustomerDealerNightId(customerId: string): Promise<string | null> {
  const rows = rowsFrom<{ dealerNightId: string }>(await db.execute(sql`
    select dealer_night_id as dealerNightId from customers where id = ${customerId} limit 1
  `));
  return rows[0]?.dealerNightId ?? null;
}

export async function listTargets(dealerNightId: string): Promise<TargetListRow[]> {
  const rows = rowsFrom<Record<string, unknown>>(await db.execute(sql`
    select c.id as customerId, c.dealer_night_id as dealerNightId,
      c.mg_code as mgCode, c.mg_name as mgName,
      c.depot_code as depotCode, c.depot_name as depotName,
      c.salesman, c.spv, c.target_dn_awal as targetAwal,
      c.target_dn_awal + coalesce(sum(a.delta), 0) as targetEfektif,
      coalesce(sum(a.delta), 0) as delta,
      max(a.created_at) as lastAdjustedAt
    from customers c
    left join target_adjustments a on a.customer_id = c.id
    where c.dealer_night_id = ${dealerNightId}
    group by c.id, c.dealer_night_id, c.mg_code, c.mg_name, c.depot_code,
      c.depot_name, c.salesman, c.spv, c.target_dn_awal
    order by targetEfektif desc, lastAdjustedAt asc, c.mg_name asc
  `));

  return rows.map((row) => ({
    customerId: String(row.customerId),
    dealerNightId: String(row.dealerNightId),
    mgCode: String(row.mgCode),
    mgName: String(row.mgName),
    depotCode: String(row.depotCode),
    depotName: String(row.depotName),
    salesman: row.salesman == null ? null : String(row.salesman),
    spv: row.spv == null ? null : String(row.spv),
    targetAwal: Number(row.targetAwal),
    targetEfektif: Number(row.targetEfektif),
    delta: Number(row.delta),
    lastAdjustedAt: row.lastAdjustedAt == null ? null : new Date(String(row.lastAdjustedAt)),
  }));
}

export async function getTargetHistory(customerId: string) {
  const rows = rowsFrom<Record<string, unknown>>(await db.execute(sql`
    select a.id, a.customer_id as customerId, a.delta, a.note,
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
    note: row.note == null ? null : String(row.note),
    recordedBy: row.recordedBy == null ? null : String(row.recordedBy),
    recordedByName: row.recordedByName == null ? null : String(row.recordedByName),
    createdAt: new Date(String(row.createdAt)),
  }));
}
