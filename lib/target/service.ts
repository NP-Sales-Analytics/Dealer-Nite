import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { targetAdjustments } from '@/lib/db/schema';
import { MIN_TARGET_DN, validateTargetDn } from '@/lib/target/rules';
import { isoUtc as isoAtauNull } from '@/lib/utils';

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
  formVerifikasi: number | null;
  formTerakhir: number | null;
  qtyHadir: number | null;
  /** Pax terdaftar dari master; null = belum didata. */
  paxTerdaftar: number | null;
  nomorUndian: string | null;
  checkedInAt: string | null;
};

const teksAtauNull = (value: unknown) => (value == null ? null : String(value));

const PESAN_GALAT = {
  NOT_FOUND: 'Toko tidak ditemukan.',
  BELOW_MINIMUM: 'Target DN minimal Rp50.000.000.',
  INVALID_TARGET: 'Target DN tidak valid.',
  NO_CHANGE: 'Target baru sama dengan target saat ini, tidak ada yang disesuaikan.',
} as const;

export class TargetServiceError extends Error {
  constructor(public readonly code: keyof typeof PESAN_GALAT) {
    super(PESAN_GALAT[code]);
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Nomor formulir berikutnya untuk satu DN. UPDATE ... LAST_INSERT_ID() menaikkan
 * penghitung secara atomik dan mengunci baris DN sampai transaksi selesai, jadi
 * dua admin yang menyimpan bersamaan tidak pernah mendapat nomor yang sama.
 */
async function ambilNoFormulir(tx: Tx, dealerNightId: string): Promise<number> {
  await tx.execute(sql`
    update dealer_nights set form_terakhir = last_insert_id(form_terakhir + 1) where id = ${dealerNightId}
  `);
  const [row] = rowsFrom<{ nomor: number | string }>(await tx.execute(sql`select last_insert_id() as nomor`));
  return Number(row.nomor);
}

/** Nomor yang akan dipakai penyimpanan berikutnya di DN ini (belum dipesan). */
export async function noFormulirBerikut(dealerNightId: string): Promise<number> {
  const [row] = rowsFrom<{ nomor: number | string }>(await db.execute(sql`
    select form_terakhir + 1 as nomor from dealer_nights where id = ${dealerNightId}
  `));
  return Number(row?.nomor ?? 1);
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
}): Promise<TargetSnapshot & { noFormulir: number }> {
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
    if (!verifikasi && delta === 0) throw new TargetServiceError('NO_CHANGE');

    const noFormulir = await ambilNoFormulir(tx, customer.dealerNightId);
    await tx.insert(targetAdjustments).values({
      id: randomUUID(),
      customerId,
      dealerNightId: customer.dealerNightId,
      noFormulir,
      delta,
      jenis: verifikasi ? 'verifikasi' : 'penyesuaian',
      note: note?.trim() || null,
      recordedBy: actorId,
    });
    if (verifikasi) {
      await tx.execute(sql`
        update customers
        set verified_at = current_timestamp(3), verified_by = ${actorId}, target_verifikasi = ${newTarget}
        where id = ${customerId}
      `);
    }

    return { customerId, targetAwal, targetEfektif: newTarget, delta, noFormulir };
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
      c.target_verifikasi as targetVerifikasi, a.formVerifikasi, a.formTerakhir,
      r.qty_hadir as qtyHadir, r.nomor_undian as nomorUndian, r.checked_in_at as checkedInAt,
      c.qty_undangan as paxTerdaftar
    from customers c
    left join (
      select t.customer_id, sum(t.delta) as total, sum(t.jenis = 'penyesuaian') as jumlah, max(t.created_at) as terakhir,
        max(case when t.jenis = 'verifikasi' then t.no_formulir end) as formVerifikasi, max(t.no_formulir) as formTerakhir
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
    formVerifikasi: row.formVerifikasi == null ? null : Number(row.formVerifikasi),
    formTerakhir: row.formTerakhir == null ? null : Number(row.formTerakhir),
    qtyHadir: row.qtyHadir == null ? null : Number(row.qtyHadir),
    paxTerdaftar: row.paxTerdaftar == null ? null : Number(row.paxTerdaftar),
    nomorUndian: teksAtauNull(row.nomorUndian),
    checkedInAt: isoAtauNull(row.checkedInAt),
  }));
}

export async function getTargetHistory(customerId: string) {
  const rows = rowsFrom<Record<string, unknown>>(await db.execute(sql`
    select a.id, a.customer_id as customerId, a.delta, a.jenis, a.no_formulir as noFormulir, a.note,
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
    noFormulir: row.noFormulir == null ? null : Number(row.noFormulir),
    note: row.note == null ? null : String(row.note),
    recordedBy: row.recordedBy == null ? null : String(row.recordedBy),
    recordedByName: row.recordedByName == null ? null : String(row.recordedByName),
    createdAt: new Date(isoAtauNull(row.createdAt)!),
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

export class FormulirError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'FormulirError';
  }
}

/**
 * Mengubah nomor formulir riwayat satu toko, mis. untuk menyamakan dengan
 * formulir fisik yang dulu dinomori manual. Nomor wajib unik per DN; penghitung
 * DN dinaikkan bila perlu supaya nomor otomatis berikutnya tidak bentrok.
 */
export async function ubahNoFormulir(customerId: string, items: { id: string; noFormulir: number | null }[]) {
  await db.transaction(async (tx) => {
    const [customer] = rowsFrom<{ dealerNightId: string }>(await tx.execute(sql`
      select dealer_night_id as dealerNightId from customers where id = ${customerId} for update
    `));
    if (!customer) throw new FormulirError('Toko tidak ditemukan.', 404);
    // Mengunci baris DN juga menahan ambilNoFormulir sampai perubahan ini selesai.
    await tx.execute(sql`select id from dealer_nights where id = ${customer.dealerNightId} for update`);

    const milikToko = new Set(rowsFrom<{ id: string }>(await tx.execute(sql`
      select id from target_adjustments where customer_id = ${customerId}
    `)).map((row) => String(row.id)));
    if (items.some((item) => !milikToko.has(item.id))) throw new FormulirError('Ada riwayat yang bukan milik toko ini.');
    // Kosong (null) = belum dicatat; aturan unik & penghitung hanya untuk yang terisi.
    const nomor = items.map((item) => item.noFormulir).filter((n): n is number => n !== null);
    if (new Set(nomor).size !== nomor.length) throw new FormulirError('Nomor formulir tidak boleh sama dalam satu toko.');

    const ids = items.map((item) => item.id);
    const bentrok = nomor.length === 0 ? undefined : rowsFrom<{ nomor: number; nama: string }>(await tx.execute(sql`
      select a.no_formulir as nomor, c.mg_name as nama
      from target_adjustments a join customers c on c.id = a.customer_id
      where a.dealer_night_id = ${customer.dealerNightId}
        and a.no_formulir in (${sql.join(nomor.map((n) => sql`${n}`), sql`, `)})
        and a.id not in (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})
      limit 1
    `))[0];
    if (bentrok) throw new FormulirError(`No. Formulir ${bentrok.nomor} sudah dipakai oleh ${bentrok.nama}.`, 409);

    // Nomor sementara negatif dulu supaya bertukar nomor antar riwayat toko yang
    // sama tidak menabrak unique index di tengah jalan.
    for (const [index, item] of items.entries()) {
      await tx.execute(sql`update target_adjustments set no_formulir = ${-(index + 1)} where id = ${item.id}`);
    }
    for (const item of items) {
      await tx.execute(sql`update target_adjustments set no_formulir = ${item.noFormulir} where id = ${item.id}`);
    }
    if (nomor.length > 0) {
      await tx.execute(sql`
        update dealer_nights set form_terakhir = greatest(form_terakhir, ${Math.max(...nomor)})
        where id = ${customer.dealerNightId}
      `);
    }
  });
}
