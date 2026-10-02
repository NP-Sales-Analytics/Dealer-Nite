import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth';
import { requireTargetAdjustment } from '@/lib/target/access';
import { FormulirError, getCustomerScope, ubahNoFormulir } from '@/lib/target/service';
import { targetErrorResponse } from '../_response';

const schema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    id: z.string().min(1).max(36),
    noFormulir: z.number().int('No. Formulir harus bilangan bulat.').min(1, 'No. Formulir minimal 1.').max(9_999_999).nullable(),
  }).strict()).min(1).max(200),
}).strict();

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Belum login' }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid.' }, { status: 400 });
  }
  try {
    const scope = await getCustomerScope(parsed.data.customerId);
    if (!scope) return NextResponse.json({ error: 'Toko tidak ditemukan.' }, { status: 404 });
    requireTargetAdjustment(user, scope.dealerNightId, scope.depotCode);
    await ubahNoFormulir(parsed.data.customerId, parsed.data.items);
    return NextResponse.json({ status: 'updated' });
  } catch (error) {
    if (error instanceof FormulirError) return NextResponse.json({ error: error.message }, { status: error.status });
    return targetErrorResponse(error);
  }
}
