'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { db } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { papan } from '@/lib/order/papan';

const teks = (formData: FormData, nama: string) => String(formData.get(nama) ?? '').trim();
const kosongJadiNull = (v: string) => (v === '' ? null : v);

/**
 * Menambah master customer baru dari halaman Detail Order.
 *
 * kode_sap bukan sekadar identitas: ia adalah kredensial login customer (lihat
 * app/(auth)/login/actions.ts), jadi keunikannya wajib dan bentrokannya harus
 * dilaporkan dengan jelas alih-alih melempar galat basis data.
 */
export async function tambahMasterCustomer(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  await requireRole(['superadmin', 'admin_rsvp']);

  // Nama disimpan huruf besar mengikuti konvensi 0003_nama_upper.sql.
  const namaToko = teks(formData, 'namaToko').toUpperCase();
  const kodeSap = teks(formData, 'kodeSap');
  const qtyMentah = teks(formData, 'qtyUndangan');
  const qtyUndangan = qtyMentah === '' ? 1 : Number(qtyMentah);

  if (namaToko.length < 2) return 'Nama toko minimal 2 karakter.';
  if (kodeSap === '') return 'Kode SAP wajib diisi.';
  if (!Number.isInteger(qtyUndangan) || qtyUndangan < 0) return 'Qty undangan tidak valid.';

  const [bentrok] = await db
    .select({ id: customers.id })
    .from(customers)
    .where(eq(customers.kodeSap, kodeSap))
    .limit(1);
  if (bentrok) return 'Kode SAP sudah dipakai toko lain.';

  await db.insert(customers).values({
    namaToko,
    kodeSap,
    qtyUndangan,
    depot: kosongJadiNull(teks(formData, 'depot')),
    wilayah: kosongJadiNull(teks(formData, 'wilayah')),
    region: kosongJadiNull(teks(formData, 'region')),
    namaPemilik: kosongJadiNull(teks(formData, 'namaPemilik').toUpperCase()),
    picRsmAsm: kosongJadiNull(teks(formData, 'picRsmAsm')),
  });

  papan.clear();
  bersihkanCacheDashboard();
  revalidatePath('/order/detail');
  return null;
}
