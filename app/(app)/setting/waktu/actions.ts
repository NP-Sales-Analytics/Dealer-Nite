'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { simpanTenggat } from '@/lib/settings';

/**
 * Menyimpan batas waktu penambahan order.
 *
 * Input date+time dari browser tidak membawa zona waktu, dan server bisa saja
 * berjalan di UTC. Karena seluruh aplikasi memakai Asia/Jakarta (lihat
 * jamJakarta di lib/utils.ts), offsetnya dipasang eksplisit +07:00 - Indonesia
 * tidak mengenal DST, jadi offset tetap ini aman.
 */
export async function simpanWaktu(
  _prev: string | null,
  formData: FormData,
): Promise<string | null> {
  await requireRole(['superadmin']);

  const tanggal = String(formData.get('tanggal') ?? '').trim();
  // Jam dan menit datang terpisah dari dua dropdown 24 jam, bukan <input
  // type="time"> - tampilan input itu mengikuti locale browser, dan di sebagian
  // perangkat berubah jadi AM/PM.
  const jam = String(formData.get('jam') ?? '').trim();
  const menit = String(formData.get('menit') ?? '').trim();

  if (tanggal === '' && jam === '' && menit === '') {
    await simpanTenggat(null);
    revalidatePath('/setting/waktu');
    return null;
  }
  if (tanggal === '' || jam === '' || menit === '') return 'Isi tanggal, jam, dan menit.';

  const waktu = new Date(`${tanggal}T${jam}:${menit}:00+07:00`);
  if (Number.isNaN(waktu.getTime())) return 'Tanggal atau jam tidak valid.';

  await simpanTenggat(waktu.toISOString());
  revalidatePath('/setting/waktu');
  return null;
}

/** Mencabut tenggat: penambahan order kembali terbuka tanpa batas waktu. */
export async function cabutWaktu(): Promise<void> {
  await requireRole(['superadmin']);
  await simpanTenggat(null);
  revalidatePath('/setting/waktu');
}
