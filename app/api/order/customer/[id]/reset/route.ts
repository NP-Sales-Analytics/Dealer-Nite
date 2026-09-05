import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, orderAdjustments } from '@/lib/db/schema';
import { segarkanOrder } from '@/lib/order/segarkan';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Mengosongkan seluruh pengambilan sebuah toko: ledger dibuang dan pengambilan
 * pertama dilepas, sehingga toko kembali seperti belum pernah mengambil.
 *
 * BEDA dengan DELETE pada route induknya: yang itu menghapus master tokonya
 * (beserta kehadirannya), yang ini hanya angka ordernya - tokonya tetap ada.
 *
 * Seperti koreksi admin lainnya, sengaja tidak tunduk pada tenggat penambahan.
 */
export async function POST(_request: NextRequest, { params }: Ctx) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'id tidak valid' }, { status: 400 });
  }

  const hasil = await db.transaction(async (tx) => {
    const [toko] = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);
    if (!toko) return null;

    const dibuang = await tx
      .delete(orderAdjustments)
      .where(eq(orderAdjustments.customerId, id))
      .returning({ id: orderAdjustments.id });

    // Lantai ikut dilepas - kalau tidak, toko tetap terkunci pada angka lama
    // padahal catatannya sudah kosong.
    await tx.update(customers).set({ dusAwal: null }).where(eq(customers.id, id));

    return { dibuang: dibuang.length };
  });

  if (!hasil) return NextResponse.json({ code: 'NOT_FOUND' }, { status: 404 });

  segarkanOrder(id);
  return NextResponse.json({ status: 'reset', dibuang: hasil.dibuang });
}
