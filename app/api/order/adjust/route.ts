import { eq, sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { orderAdjustments } from '@/lib/db/schema';
import { rateLimit } from '@/lib/rate-limit';
import { getSession } from '@/lib/session';
import { orderAdjustSchema } from '@/lib/validations/order';

// Siapa yang boleh mencatat order atas nama toko (staff on-behalf).
const STAFF_ORDER_ROLES = ['superadmin', 'admin_rsvp'] as const;

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
  }

  const { ok } = await rateLimit(`order-adjust:${session.kind}:${session.id}`);
  if (!ok) return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });

  // Transaksi + advisory lock per-toko men-serialkan baca-cek-tulis satu toko, jadi
  // dua penambahan hampir bersamaan tidak bisa sama-sama lolos cek dan bikin minus.
  // ponytail: advisory lock per-toko. Naikkan ke trigger/constraint kalau kelak perlu.
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${targetId}, 0))`);

    const [{ total: current }] = await tx
      .select({ total: sql<number>`coalesce(sum(${orderAdjustments.qtyChange}), 0)::int` })
      .from(orderAdjustments)
      .where(eq(orderAdjustments.customerId, targetId));

    if (current + qtyChange < 0) return { rejected: true as const, total: current };

    await tx.insert(orderAdjustments).values({ customerId: targetId, qtyChange, recordedBy });
    return { rejected: false as const, total: current + qtyChange };
  });

  if (result.rejected) {
    return NextResponse.json(
      { code: 'NEGATIVE', message: 'Total tidak boleh kurang dari 0.', total: result.total },
      { status: 409 },
    );
  }
  return NextResponse.json({ total: result.total });
}
