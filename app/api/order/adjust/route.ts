import { eq, sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { orderAdjustments } from '@/lib/db/schema';
import { requireCustomerApi } from '@/lib/order-session';
import { rateLimit } from '@/lib/rate-limit';
import { orderAdjustSchema } from '@/lib/validations/order';

export async function POST(request: NextRequest) {
  const customerId = await requireCustomerApi();
  if (customerId instanceof NextResponse) return customerId;

  const { ok } = await rateLimit(`order-adjust:${customerId}`);
  if (!ok) return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });

  const parsed = orderAdjustSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID', issues: parsed.error.issues }, { status: 400 });
  }
  const { qtyChange } = parsed.data;

  // Transaksi + advisory lock per-customer men-serialkan baca-cek-tulis milik SATU
  // customer, jadi dua klik hampir bersamaan tidak bisa sama-sama lolos cek dan
  // membuat total minus. Lock hanya menyentuh customer ini; customer lain jalan
  // paralel.
  // ponytail: advisory lock per-customer. Kalau kelak butuh jaminan lintas-jalur,
  // naikkan ke trigger/constraint tingkat tabel - untuk satu customer per klik ini cukup.
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${customerId}, 0))`);

    const [{ total: current }] = await tx
      .select({ total: sql<number>`coalesce(sum(${orderAdjustments.qtyChange}), 0)::int` })
      .from(orderAdjustments)
      .where(eq(orderAdjustments.customerId, customerId));

    if (current + qtyChange < 0) return { rejected: true as const, total: current };

    await tx.insert(orderAdjustments).values({ customerId, qtyChange });
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
