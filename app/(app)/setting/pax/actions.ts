'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cakupanDepot, canReadDealerNight } from '@/lib/access';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { dealerNights } from '@/lib/db/schema';
import { simpanTargetPax } from '@/lib/pax-targets';
import { aturDnTampilanAwal, depotSatuDn, wilayahDn } from '@/lib/target/dealer-night-options';
import { WILAYAH, type Wilayah } from '@/lib/target/dn-bawaan';

/** DN tampilan awal satu wilayah untuk semua halaman; string kosong = otomatis (DN terdekat). */
export async function simpanDnTampilanAwal(wilayah: string, dealerNightId: string): Promise<string | null> {
  const me = await requireRole(['superadmin']);
  if (!WILAYAH.includes(wilayah as Wilayah)) return 'Wilayah tidak dikenal.';
  if (me.wilayah && me.wilayah !== wilayah) return `Anda hanya bisa mengatur ${me.wilayah}.`;
  if (dealerNightId) {
    const [dn] = await db.select({ id: dealerNights.id }).from(dealerNights)
      .where(and(eq(dealerNights.id, dealerNightId), eq(dealerNights.active, true))).limit(1);
    if (!dn) return 'Dealer Night tidak ditemukan atau tidak aktif.';
    if (wilayahDn(await depotSatuDn(dealerNightId)) !== wilayah) return `Dealer Night ini bukan wilayah ${wilayah}.`;
  }
  await aturDnTampilanAwal(wilayah as Wilayah, dealerNightId || null);
  revalidatePath('/', 'layout');
  return null;
}

export async function simpanSettingPax(formData: FormData): Promise<string | null> {
  const user = await requireRole(['superadmin', 'admin']);

  const ids = formData.getAll('dealerNightId').map((value) => String(value).trim());
  const nilai = formData.getAll('targetPax').map((value) => String(value).trim());
  const rupiah = (key: string) => formData.getAll(key).map((value) => String(value).replace(/[^0-9]/g, ''));
  const targetDn = rupiah('targetDn');
  const minTarget = rupiah('minTargetDn');
  const kuponPink = rupiah('nilaiKuponPink');
  const kuponHijau = rupiah('nilaiKuponHijau');

  if (ids.length === 0 || [nilai, targetDn, minTarget, kuponPink, kuponHijau].some((list) => list.length !== ids.length)) {
    return 'Daftar Dealer Night tidak lengkap. Muat ulang halaman lalu coba lagi.';
  }
  if (ids.some((id) => !canReadDealerNight(user, id))) return 'Tidak punya akses ke Dealer Night ini.';
  // Target DN dan pax berlaku untuk seluruh DN, jadi akun berbatas depot tidak boleh mengubahnya.
  if (cakupanDepot(user)) return 'Akun dengan akses per depot tidak bisa mengubah target Dealer Night.';

  try {
    await simpanTargetPax(ids.map((dealerNightId, index) => ({
      dealerNightId,
      targetPax: nilai[index] === '' ? Number.NaN : Number(nilai[index]),
      targetDn: Number(targetDn[index] || 0),
      minTargetDn: Number(minTarget[index] || 0),
      nilaiKuponPink: Number(kuponPink[index] || 0),
      nilaiKuponHijau: Number(kuponHijau[index] || 0),
    })));
  } catch {
    return 'Target pax harus 0 sampai 1.000.000, Target DN berupa rupiah bulat, target minimal dan pembagi kupon minimal Rp1.000.000.';
  }

  revalidatePath('/setting/pax');
  revalidatePath('/dashboard');
  revalidatePath('/kupon');
  revalidatePath('/order/detail');
  return null;
}
