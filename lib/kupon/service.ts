import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/lib/db';
import { kuponProses } from '@/lib/db/schema';
import {
  NAMA_KUPON, prosesKupon, totalKupon, type JumlahKupon, type KonfigKupon, type SkemaKupon,
} from '@/lib/target/kupon';
import { isoUtc as iso } from '@/lib/utils';

export class KuponError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = 'KuponError';
  }
}

export type TahapKupon = 'dibuat' | 'diberikan';

export type KuponRow = {
  customerId: string;
  mgCode: string;
  mgName: string;
  depotCode: string;
  depotName: string;
  wilayah: string | null;
  region: string | null;
  salesman: string | null;
  spv: string | null;
  verified: boolean;
  targetVerifikasi: number | null;
  targetEfektif: number;
  qtyHadir: number | null;
  nomorUndian: string | null;
  checkedInAt: string | null;
  dibuat: JumlahKupon;
  diberikan: JumlahKupon;
  terakhir: string | null;
};

const rowsFrom = <T,>(result: unknown) => (result as [T[], unknown])[0];

export const catatKuponSchema = z.object({
  customerId: z.string().uuid(),
  tahap: z.enum(['dibuat', 'diberikan']),
  pink: z.number().int().min(0).max(100_000),
  hijau: z.number().int().min(0).max(100_000),
  penerima: z.string().trim().max(200).optional(),
  catatan: z.string().trim().max(1000).optional(),
}).strict().refine((value) => value.pink + value.hijau > 0, { message: 'Isi jumlah kupon minimal 1.' });

export const catatMassalSchema = z.object({
  dealerNightId: z.string().min(1).max(36),
  customerIds: z.array(z.string().uuid()).min(1).max(1000),
  tahap: z.enum(['dibuat', 'diberikan']),
}).strict();

type Executor = Pick<typeof db, 'execute'>;

const konfigDari = (row: Record<string, unknown>): KonfigKupon => ({
  skema: String(row.kuponSkema) as SkemaKupon,
  nilai: { pink: Number(row.nilaiKuponPink), hijau: Number(row.nilaiKuponHijau) },
});

/** Skema warna dan nilai pembagi kupon satu DN. */
export async function konfigKupon(dealerNightId: string): Promise<KonfigKupon> {
  const [row] = rowsFrom<Record<string, unknown>>(await db.execute(sql`
    select kupon_skema as kuponSkema, nilai_kupon_pink as nilaiKuponPink, nilai_kupon_hijau as nilaiKuponHijau
    from dealer_nights where id = ${dealerNightId}
  `));
  if (!row) throw new KuponError('Dealer Night tidak ditemukan.', 404);
  return konfigDari(row);
}

/** Posisi kupon satu toko; dengan `kunci` baris toko dikunci untuk transaksi tulis. */
async function posisiToko(ex: Executor, customerId: string, kunci = false) {
  const [customer] = rowsFrom<Record<string, unknown>>(await ex.execute(sql`
    select c.id, c.dealer_night_id as dealerNightId, c.depot_code as depotCode, c.mg_name as mgName, c.verified_at as verifiedAt,
      c.target_dn_awal + coalesce((select sum(delta) from target_adjustments where customer_id = c.id), 0) as target,
      d.kupon_skema as kuponSkema, d.nilai_kupon_pink as nilaiKuponPink, d.nilai_kupon_hijau as nilaiKuponHijau
    from customers c join dealer_nights d on d.id = c.dealer_night_id where c.id = ${customerId}
    ${kunci ? sql`for update of c` : sql``}
  `));
  if (!customer) throw new KuponError('Toko tidak ditemukan.', 404);
  const [jumlah] = rowsFrom<Record<string, unknown>>(await ex.execute(sql`
    select
      coalesce(sum(case when tahap = 'dibuat' then pink end), 0) as dibuatPink,
      coalesce(sum(case when tahap = 'dibuat' then hijau end), 0) as dibuatHijau,
      coalesce(sum(case when tahap = 'diberikan' then pink end), 0) as diberikanPink,
      coalesce(sum(case when tahap = 'diberikan' then hijau end), 0) as diberikanHijau
    from kupon_proses where customer_id = ${customerId}
  `));
  const konfig = konfigDari(customer);
  return {
    dealerNightId: String(customer.dealerNightId),
    depotCode: String(customer.depotCode),
    mgName: String(customer.mgName),
    skema: konfig.skema,
    proses: prosesKupon({
      nilai: konfig.nilai,
      verified: customer.verifiedAt != null,
      target: Number(customer.target),
      dibuat: { pink: Number(jumlah.dibuatPink), hijau: Number(jumlah.dibuatHijau) },
      diberikan: { pink: Number(jumlah.diberikanPink), hijau: Number(jumlah.diberikanHijau) },
    }),
  };
}

export async function scopeKupon(customerId: string) {
  const { dealerNightId, depotCode } = await posisiToko(db, customerId);
  return { dealerNightId, depotCode };
}

export async function listKupon(dealerNightId: string): Promise<KuponRow[]> {
  const rows = rowsFrom<Record<string, unknown>>(await db.execute(sql`
    select c.id as customerId, c.mg_code as mgCode, c.mg_name as mgName, c.depot_code as depotCode, c.depot_name as depotName,
      c.wilayah, c.region, c.salesman, c.spv, c.verified_at is not null as verified, c.target_verifikasi as targetVerifikasi,
      c.target_dn_awal + coalesce(a.total, 0) as targetEfektif,
      r.qty_hadir as qtyHadir, r.nomor_undian as nomorUndian, r.checked_in_at as checkedInAt,
      coalesce(k.dibuatPink, 0) as dibuatPink, coalesce(k.dibuatHijau, 0) as dibuatHijau,
      coalesce(k.diberikanPink, 0) as diberikanPink, coalesce(k.diberikanHijau, 0) as diberikanHijau,
      k.terakhir
    from customers c
    left join (
      select t.customer_id, sum(t.delta) as total
      from target_adjustments t join customers c2 on c2.id = t.customer_id
      where c2.dealer_night_id = ${dealerNightId}
      group by t.customer_id
    ) a on a.customer_id = c.id
    left join (
      select customer_id,
        sum(case when tahap = 'dibuat' then pink else 0 end) as dibuatPink,
        sum(case when tahap = 'dibuat' then hijau else 0 end) as dibuatHijau,
        sum(case when tahap = 'diberikan' then pink else 0 end) as diberikanPink,
        sum(case when tahap = 'diberikan' then hijau else 0 end) as diberikanHijau,
        max(created_at) as terakhir
      from kupon_proses where dealer_night_id = ${dealerNightId}
      group by customer_id
    ) k on k.customer_id = c.id
    left join reservations r on r.customer_id = c.id
    where c.dealer_night_id = ${dealerNightId}
    order by targetEfektif desc, c.mg_name asc
  `));
  return rows.map((row) => ({
    customerId: String(row.customerId),
    mgCode: String(row.mgCode),
    mgName: String(row.mgName),
    depotCode: String(row.depotCode),
    depotName: String(row.depotName),
    wilayah: row.wilayah == null ? null : String(row.wilayah),
    region: row.region == null ? null : String(row.region),
    salesman: row.salesman == null ? null : String(row.salesman),
    spv: row.spv == null ? null : String(row.spv),
    verified: Number(row.verified) === 1,
    targetVerifikasi: row.targetVerifikasi == null ? null : Number(row.targetVerifikasi),
    targetEfektif: Number(row.targetEfektif),
    qtyHadir: row.qtyHadir == null ? null : Number(row.qtyHadir),
    nomorUndian: row.nomorUndian == null ? null : String(row.nomorUndian),
    checkedInAt: iso(row.checkedInAt),
    dibuat: { pink: Number(row.dibuatPink), hijau: Number(row.dibuatHijau) },
    diberikan: { pink: Number(row.diberikanPink), hijau: Number(row.diberikanHijau) },
    terakhir: iso(row.terakhir),
  }));
}

export async function riwayatKupon(customerId: string) {
  const rows = rowsFrom<Record<string, unknown>>(await db.execute(sql`
    select k.id, k.tahap, k.pink, k.hijau, k.penerima, k.catatan, k.created_at as createdAt,
      p.full_name as recordedByName
    from kupon_proses k left join profiles p on p.id = k.recorded_by
    where k.customer_id = ${customerId}
    order by k.created_at desc, k.id desc
  `));
  return rows.map((row) => ({
    id: String(row.id),
    tahap: String(row.tahap) as TahapKupon,
    pink: Number(row.pink),
    hijau: Number(row.hijau),
    penerima: row.penerima == null ? null : String(row.penerima),
    catatan: row.catatan == null ? null : String(row.catatan),
    recordedByName: row.recordedByName == null ? null : String(row.recordedByName),
    createdAt: iso(row.createdAt)!,
  }));
}

function cekBatas(
  tahap: TahapKupon, proses: ReturnType<typeof prosesKupon>, jumlah: JumlahKupon, nama: string, skema: SkemaKupon,
) {
  if (proses.status === 'belum_verifikasi') throw new KuponError(`Target ${nama} belum diverifikasi; kupon belum bisa diproses.`);
  const batas = tahap === 'dibuat' ? proses.perluDibuat : proses.siapDiberikan;
  if (jumlah.pink > batas.pink || jumlah.hijau > batas.hijau) {
    const label = NAMA_KUPON[skema];
    const rincian = `${batas.pink} ${label.pink.toLowerCase()}, ${batas.hijau} ${label.hijau.toLowerCase()}`;
    throw new KuponError(tahap === 'dibuat'
      ? `Maksimal yang bisa dibuat untuk ${nama}: ${rincian}.`
      : `Maksimal yang bisa diberikan untuk ${nama}: ${rincian} (sesuai kupon yang sudah dibuat).`);
  }
}

export async function catatKupon(input: z.infer<typeof catatKuponSchema> & { actorId: string }) {
  return db.transaction(async (tx) => {
    const { dealerNightId, mgName, proses, skema } = await posisiToko(tx, input.customerId, true);
    cekBatas(input.tahap, proses, input, mgName, skema);
    await tx.insert(kuponProses).values({
      id: randomUUID(),
      dealerNightId,
      customerId: input.customerId,
      tahap: input.tahap,
      pink: input.pink,
      hijau: input.hijau,
      penerima: input.penerima || null,
      catatan: input.catatan || null,
      recordedBy: input.actorId,
    });
  });
}

/** Proses semua sisa kupon toko-toko terpilih sekaligus; toko tanpa sisa dilewati. */
export async function catatKuponMassal(input: z.infer<typeof catatMassalSchema> & {
  actorId: string;
  bolehDepot: (depotCode: string) => boolean;
}) {
  return db.transaction(async (tx) => {
    let diproses = 0;
    let dilewati = 0;
    for (const customerId of input.customerIds) {
      const { dealerNightId, depotCode, proses } = await posisiToko(tx, customerId, true);
      if (dealerNightId !== input.dealerNightId) throw new KuponError('Ada toko dari Dealer Night lain.', 403);
      if (!input.bolehDepot(depotCode)) throw new KuponError('Ada toko dari depot di luar akses Anda.', 403);
      const jumlah = input.tahap === 'dibuat' ? proses.perluDibuat : proses.siapDiberikan;
      if (proses.status === 'belum_verifikasi' || totalKupon(jumlah) === 0) {
        dilewati += 1;
        continue;
      }
      await tx.insert(kuponProses).values({
        id: randomUUID(), dealerNightId, customerId, tahap: input.tahap, ...jumlah,
        recordedBy: input.actorId,
      });
      diproses += 1;
    }
    return { diproses, dilewati };
  });
}

export async function eventKupon(id: string) {
  const [row] = rowsFrom<Record<string, unknown>>(await db.execute(sql`
    select k.customer_id as customerId, k.dealer_night_id as dealerNightId, c.depot_code as depotCode
    from kupon_proses k join customers c on c.id = k.customer_id where k.id = ${id}
  `));
  return row
    ? { customerId: String(row.customerId), dealerNightId: String(row.dealerNightId), depotCode: String(row.depotCode) }
    : null;
}

/** Membatalkan satu catatan. Pembuatan tidak bisa dibatalkan bila kuponnya sudah diberikan. */
export async function batalkanKupon(id: string) {
  return db.transaction(async (tx) => {
    const [event] = rowsFrom<Record<string, unknown>>(await tx.execute(sql`
      select customer_id as customerId, tahap, pink, hijau from kupon_proses where id = ${id}
    `));
    if (!event) throw new KuponError('Catatan kupon tidak ditemukan.', 404);
    const { proses } = await posisiToko(tx, String(event.customerId), true);
    if (event.tahap === 'dibuat') {
      const sisaDibuat = { pink: proses.dibuat.pink - Number(event.pink), hijau: proses.dibuat.hijau - Number(event.hijau) };
      if (sisaDibuat.pink < proses.diberikan.pink || sisaDibuat.hijau < proses.diberikan.hijau) {
        throw new KuponError('Kupon ini sudah diberikan. Batalkan catatan pemberiannya dulu.');
      }
    }
    await tx.execute(sql`delete from kupon_proses where id = ${id}`);
  });
}
