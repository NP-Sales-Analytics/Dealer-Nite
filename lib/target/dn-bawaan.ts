/** Tanggal hari ini di Asia/Jakarta, format YYYY-MM-DD. */
export const hariIniJakarta = (now = new Date()) =>
  now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

/**
 * DN yang "sedang terlaksana": acara terdekat yang belum lewat. Kalau semua
 * sudah lewat, ambil yang terakhir. Opsi diasumsikan sudah urut tanggal.
 */
export function dnBawaan(options: { id: string; eventDate?: string | null }[], today = hariIniJakarta()): string {
  const bertanggal = options.filter((item) => item.eventDate);
  const berikut = bertanggal.find((item) => item.eventDate! >= today);
  return (berikut ?? bertanggal.at(-1) ?? options[0])?.id ?? '';
}
