'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth';
import { simpanTargetPax } from '@/lib/pax-targets';

export async function simpanSettingPax(formData: FormData): Promise<string | null> {
  await requireRole(['superadmin']);

  const depots = formData.getAll('depot').map((value) => String(value).trim());
  const nilai = formData.getAll('targetPax').map((value) => String(value).trim());

  if (depots.length === 0 || depots.length !== nilai.length) {
    return 'Daftar depot tidak lengkap. Muat ulang halaman lalu coba lagi.';
  }

  const items = depots.map((depot, index) => ({
    depot,
    targetPax: nilai[index] === '' ? Number.NaN : Number(nilai[index]),
  }));

  try {
    await simpanTargetPax(items);
  } catch (error) {
    return error instanceof Error ? error.message : 'Target pax gagal disimpan.';
  }

  revalidatePath('/setting/pax');
  revalidatePath('/dashboard');
  return null;
}

