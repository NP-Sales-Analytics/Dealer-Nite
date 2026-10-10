/** Tanggal hari ini di Asia/Jakarta, format YYYY-MM-DD. */
export const hariIniJakarta = (now = new Date()) =>
  now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

/** Urutan juga prioritas: akun yang melihat kedua wilayah memakai pilihan Barat dulu. */
export const WILAYAH = ['Indonesia Barat', 'Indonesia Timur'] as const;
export type Wilayah = (typeof WILAYAH)[number];
export type DnAwalPerWilayah = Record<Wilayah, string | null>;

/**
 * DN tampilan awal pilihan Super Admin yang berlaku untuk akun ini: pilihan
 * wilayah pertama (urutan WILAYAH) yang DN-nya ada di daftar akun. null = otomatis.
 */
export function pilihDnAwal(options: { id: string; wilayah?: string | null }[], awal: DnAwalPerWilayah): string | null {
  for (const wilayah of WILAYAH) {
    const id = awal[wilayah];
    if (id && options.some((item) => item.id === id && item.wilayah === wilayah)) return id;
  }
  return null;
}

/**
 * DN tampilan awal: yang dipilih Super Admin di Setting Target DN (bila akun
 * ini boleh melihatnya), selain itu acara terdekat yang belum lewat. Kalau
 * semua sudah lewat, ambil yang terakhir. Opsi diasumsikan sudah urut tanggal.
 */
export function dnBawaan(
  options: { id: string; eventDate?: string | null; bawaan?: boolean }[],
  today = hariIniJakarta(),
): string {
  const dipilih = options.find((item) => item.bawaan);
  if (dipilih) return dipilih.id;
  const bertanggal = options.filter((item) => item.eventDate);
  const berikut = bertanggal.find((item) => item.eventDate! >= today);
  return (berikut ?? bertanggal.at(-1) ?? options[0])?.id ?? '';
}
