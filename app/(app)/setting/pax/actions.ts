'use server';

import { revalidatePath } from 'next/cache';
import { canReadDealerNight } from '@/lib/access';
import { requireRole } from '@/lib/auth';
import { simpanTargetPax } from '@/lib/pax-targets';

export async function simpanSettingPax(formData: FormData): Promise<string | null> {
  const user = await requireRole(['superadmin', 'admin']);

  const ids = formData.getAll('dealerNightId').map((value) => String(value).trim());
  const nilai = formData.getAll('targetPax').map((value) => String(value).trim());
  const targetDn = formData.getAll('targetDn').map((value) => String(value).replace(/[^0-9]/g, ''));

  if (ids.length === 0 || ids.length !== nilai.length || ids.length !== targetDn.length) {
    return 'Daftar Dealer Night tidak lengkap. Muat ulang halaman lalu coba lagi.';
  }
  if (ids.some((id) => !canReadDealerNight(user, id))) return 'Tidak punya akses ke Dealer Night ini.';

  try {
    await simpanTargetPax(ids.map((dealerNightId, index) => ({
      dealerNightId,
      targetPax: nilai[index] === '' ? Number.NaN : Number(nilai[index]),
      targetDn: Number(targetDn[index] || 0),
    })));
  } catch {
    return 'Target pax harus 0 sampai 1.000.000 dan Target DN berupa rupiah bulat.';
  }

  revalidatePath('/setting/pax');
  revalidatePath('/dashboard');
  return null;
}
