import { Skeleton } from '@/components/ui/skeleton';

/**
 * Ditampilkan seketika saat berpindah halaman, menggantikan HANYA area konten -
 * sidebar dan header milik layout tetap terpasang.
 *
 * Fungsinya dua. Pertama, klik menu langsung berganti alih-alih membekukan layar
 * sampai server selesai. Kedua, tanpa batas loading, <Link> tidak bisa mem-prefetch
 * rute dinamis sama sekali (semua halaman di sini force-dynamic), jadi file inilah
 * yang membuat prefetch sidebar mulai berguna.
 *
 * Bentuknya sengaja umum - judul, satu baris kendali, satu blok konten - karena
 * dipakai bersama oleh keempat halaman dalam grup ini.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="mb-5 sm:mb-6">
        <Skeleton className="h-7 w-56 sm:h-8" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="mb-4 h-16 w-full rounded-2xl sm:mb-6" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}
