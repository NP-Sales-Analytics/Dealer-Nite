export type StatusPax = 'sesuai' | 'melebihi' | 'kurang';

export const LABEL_STATUS_PAX: Record<StatusPax, string> = {
  sesuai: 'Sesuai Pax',
  melebihi: 'Melebihi Pax',
  kurang: 'Kurang Pax',
};

/** Pilihan filter Status Pax; 'tanpa' = pax terdaftar belum didata / tamu manual. */
export const FILTER_STATUS_PAX = ['sesuai', 'melebihi', 'kurang', 'tanpa'] as const;
export const LABEL_FILTER_PAX: Record<string, string> = { ...LABEL_STATUS_PAX, tanpa: 'Belum Didata' };

/**
 * Pax hadir dibanding pax terdaftar di master. null bila toko belum didata
 * pax-nya (atau tamu manual) - tidak ada pembanding, jadi tidak ada status.
 */
export function statusPax(hadir: number, terdaftar: number | null | undefined): StatusPax | null {
  if (terdaftar == null) return null;
  if (hadir > terdaftar) return 'melebihi';
  if (hadir < terdaftar) return 'kurang';
  return 'sesuai';
}
