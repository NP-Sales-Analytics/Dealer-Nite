'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { clearCustomerCookie, setCustomerCookie } from '@/lib/order-session';
import { rateLimit } from '@/lib/rate-limit';
import { orderLoginSchema } from '@/lib/validations/order';

export async function loginCustomer(_prev: string | null, formData: FormData): Promise<string | null> {
  const parsed = orderLoginSchema.safeParse({ kodeSap: String(formData.get('kodeSap') ?? '') });
  if (!parsed.success) return 'Masukkan Kode SAP yang valid.';

  const { ok } = await rateLimit(`order-login:${parsed.data.kodeSap}`);
  if (!ok) return 'Terlalu banyak percobaan. Coba lagi sebentar.';

  const [c] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.kodeSap, parsed.data.kodeSap))
    .limit(1);
  if (!c) return 'Kode SAP tidak ditemukan.';

  await setCustomerCookie(c.id);
  redirect('/order');
}

export async function logoutCustomer() {
  await clearCustomerCookie();
  redirect('/order/login');
}
