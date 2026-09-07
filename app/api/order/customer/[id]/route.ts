import { eq, sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, orderAdjustments } from '@/lib/db/schema';
import { segarkanOrder } from '@/lib/order/segarkan';
import { rateLimit } from '@/lib/rate-limit';
import { orderCustomerPatchSchema } from '@/lib/validations/order';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Koreksi dari halaman Detail Order.
 *
 * SENGAJA tidak tunduk pada tenggat penambahan: kalau ada salah catat setelah
 * waktu habis, admin tetap harus punya jalan keluar. Tenggat mengunci Tambah
 * Order (/api/order/adjust), bukan koreksi admin di sini.
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });
  }

  const { ok } = await rateLimit(`order-patch:${user.id}`);
  if (!ok) return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });

  const parsed = orderCustomerPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID', issues: parsed.error.issues }, { status: 400 });
  }
  const { namaToko, depot, total } = parsed.data;

  const hasil = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${id}, 0))`);

    const [toko] = await tx
      .select({ dusAwal: customers.dusAwal })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    if (!toko) return null;

    if (namaToko !== undefined || depot !== undefined) {
      await tx
        .update(customers)
        .set({
          ...(namaToko !== undefined && { namaToko }),
          ...(depot !== undefined && { depot }),
          updatedAt: new Date(),
        })
        .where(eq(customers.id, id));
    }

    if (total === undefined) return { total: null };

    const [{ total: sekarang }] = await tx
      .select({ total: sql<number>`coalesce(sum(${orderAdjustments.qtyChange}), 0)::int` })
      .from(orderAdjustments)
      .where(eq(orderAdjustments.customerId, id));

    // Disimpan sebagai selisih, bukan menimpa baris lama: riwayat penyesuaian
    // adalah isi utama dialog overview, jadi tidak boleh hilang.
    const selisih = total - sekarang;
    if (selisih !== 0) {
      await tx.insert(orderAdjustments).values({
        customerId: id,
        qtyChange: selisih,
        note: 'admin',
        recordedBy: user.id,
      });
    }

    /**
     * Invarian dus_awal <= total. Admin di sini adalah otoritas: kalau ia
     * menetapkan angka lebih rendah dari lantai lama, lantainya ikut turun -
     * kalau tidak, toko akan terkunci pada angka yang sudah dinyatakan salah.
     * Kembali ke 0 berarti toko dianggap belum pernah mengambil.
     */
    const awalBaru =
      total === 0 ? null : toko.dusAwal === null || total < toko.dusAwal ? total : toko.dusAwal;
    if (awalBaru !== toko.dusAwal) {
      await tx.update(customers).set({ dusAwal: awalBaru }).where(eq(customers.id, id));
    }

    return { total };
  });

  if (!hasil) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  segarkanOrder();
  return NextResponse.json({ status: 'updated', total: hasil.total });
}

/** Menghapus master customer. Cascade ikut membuang kehadiran + seluruh ledgernya. */
export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });
  }

  const [dihapus] = await db
    .delete(customers)
    .where(eq(customers.id, id))
    .returning({ id: customers.id });
  if (!dihapus) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  segarkanOrder();
  return NextResponse.json({ status: 'deleted' });
}
