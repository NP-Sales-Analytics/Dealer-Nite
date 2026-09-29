import { ttlCache, type TtlCache } from '@/lib/ttl-cache';

// Semua cache dashboard didaftarkan di sini supaya satu penulisan catatan
// kehadiran bisa membersihkan seluruhnya sekaligus. Tanpa itu, admin yang baru
// mengedit sebuah catatan masih melihat angka lama sampai masa berlaku habis.
const terdaftar = new Set<TtlCache<unknown>>();

/**
 * Cache dashboard dengan dedup permintaan bersamaan.
 * Lihat lib/ttl-cache.ts untuk perilaku dan batas entrinya.
 *
 * @param ttlMs masa berlaku cache untuk agregat atau daftar operasional.
 */
export function cacheDashboard<T>(
  fn: (key: string) => Promise<T>,
  ttlMs = 15_000,
): (key?: string) => Promise<T> {
  const c = ttlCache(fn, ttlMs);
  terdaftar.add(c as TtlCache<unknown>);
  return c.get;
}

/** Dipanggil setelah membuat, mengubah, atau menghapus catatan kehadiran. */
export function bersihkanCacheDashboard() {
  for (const c of terdaftar) c.clear();
}
