import { eq, sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser, lupakanCustomer } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, orderAdjustments } from '@/lib/db/schema';
import { bolehUbahOrder, PESAN_LUAR_REGION } from '@/lib/order/akses';
import { periksaPenambahan, PESAN_TOLAKAN, type Tolakan } from '@/lib/order/aturan';
import { rateLimit } from '@/lib/rate-limit';
import { getSession } from '@/lib/session';
import { bacaTenggat } from '@/lib/settings';
import { orderAdjustSchema } from '@/lib/validations/order';

// Siapa yang boleh mencatat order atas nama toko (staff on-behalf). RSM ikut,
// tapi dikunci ke region-nya lewat bolehUbahOrder di bawah.
const STAFF_ORDER_ROLES = ['superadmin', 'admin_rsvp', 'rsm'] as const;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  const parsed = orderAdjustSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID', issues: parsed.error.issues }, { status: 400 });
  }
  const { qtyChange } = parsed.data;

  // Tentukan toko sasaran + siapa pencatat. customer_id TIDAK pernah dari body
  // untuk sesi customer - selalu dari sesi, supaya toko tidak bisa mengubah data toko lain.
  let targetId: string;
  let recordedBy: string | null = null;
  if (session.kind === 'customer') {
    targetId = session.id;
  } else {
    const user = await getSessionUser();
    if (!user || !STAFF_ORDER_ROLES.includes(user.role as (typeof STAFF_ORDER_ROLES)[number])) {
      return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
    }
    if (!parsed.data.customerId) {
      return NextResponse.json({ code: 'INVALID', error: 'customerId wajib untuk staff' }, { status: 400 });
    }
    targetId = parsed.data.customerId;
    recordedBy = user.id;

    // Ditegakkan DI SINI, bukan sekadar dengan menyaring hasil pencarian:
    // customerId datang dari body, jadi RSM bisa saja mengirim id toko region
    // lain. Catatan: pembatasan ini hanya untuk mencatat order - papan Top
    // Spender tetap memperlihatkan seluruh toko kepada semua peran tim.
    if (!(await bolehUbahOrder(user, targetId))) {
      return NextResponse.json({ error: PESAN_LUAR_REGION }, { status: 403 });
    }
  }

  const { ok } = await rateLimit(`order-adjust:${session.kind}:${session.id}`);
  if (!ok) return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });

  const tenggat = await bacaTenggat();

  // Transaksi + advisory lock per-toko men-serialkan baca-cek-tulis satu toko, jadi
  // dua penambahan hampir bersamaan tidak bisa sama-sama lolos cek.
  // ponytail: advisory lock per-toko. Naikkan ke trigger/constraint kalau kelak perlu.
  const hasil = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${targetId}, 0))`);

    const [{ total: sekarang }] = await tx
      .select({ total: sql<number>`coalesce(sum(${orderAdjustments.qtyChange}), 0)::int` })
      .from(orderAdjustments)
      .where(eq(orderAdjustments.customerId, targetId));

    // Dibaca di dalam transaksi, bukan dari cache: nilainya ikut menentukan
    // keputusan, jadi harus versi terbaru.
    const [toko] = await tx
      .select({ dusAwal: customers.dusAwal })
      .from(customers)
      .where(eq(customers.id, targetId))
      .limit(1);
    if (!toko) return { tolakan: 'NOT_FOUND' as const, total: sekarang };

    const totalBaru = sekarang + qtyChange;
    const tolakan = periksaPenambahan({ totalBaru, dusAwal: toko.dusAwal, tenggat });
    if (tolakan) return { tolakan, total: sekarang };

    await tx.insert(orderAdjustments).values({ customerId: targetId, qtyChange, recordedBy });

    // Pengambilan pertama yang tercatat menjadi lantai permanen.
    const awalBaru = toko.dusAwal === null && totalBaru > 0 ? totalBaru : null;
    if (awalBaru !== null) {
      await tx.update(customers).set({ dusAwal: awalBaru }).where(eq(customers.id, targetId));
    }

    return { tolakan: null, total: totalBaru, dusAwal: toko.dusAwal ?? awalBaru };
  });

  if (hasil.tolakan === 'NOT_FOUND') {
    return NextResponse.json({ code: 'NOT_FOUND', error: 'Toko tidak ditemukan' }, { status: 404 });
  }
  if (hasil.tolakan) {
    const kode = hasil.tolakan as NonNullable<Tolakan>;
    return NextResponse.json(
      { code: kode, message: PESAN_TOLAKAN[kode], total: hasil.total },
      { status: 409 },
    );
  }

  // dus_awal ikut di-cache bersama identitas toko; buang supaya lantai barunya terbaca.
  if (hasil.dusAwal !== null) lupakanCustomer(targetId);

  return NextResponse.json({ total: hasil.total, dusAwal: hasil.dusAwal });
}
