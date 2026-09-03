/**
 * Cache per-proses dengan masa berlaku dan dedup permintaan bersamaan.
 *
 * Dedup adalah bagian pentingnya: saat cache dingin dan puluhan admin membuka
 * halaman yang sama bersamaan, semuanya berbagi SATU pemanggilan sumber, bukan
 * satu per admin yang antre di kolam koneksi.
 *
 * ponytail: cache per-instance, bukan lintas-instance. Konsekuensinya N instance
 * serverless = N pemanggilan per masa berlaku, bukan 1. Untuk data sekecil ini
 * itu beberapa panggilan per detik - tidak perlu Redis kecuali jumlah instance
 * benar-benar meledak.
 */
export type TtlCache<T> = {
  get: (key?: string) => Promise<T>;
  clear: (key?: string) => void;
};

export function ttlCache<T>(
  fn: (key: string) => Promise<T>,
  ttlMs: number,
  maxEntri = 200,
): TtlCache<T> {
  const tersimpan = new Map<string, { at: number; data: T }>();
  const berjalan = new Map<string, Promise<T>>();

  return {
    get(key = '') {
      const segar = tersimpan.get(key);
      if (segar && Date.now() - segar.at < ttlMs) return Promise.resolve(segar.data);

      const jalan = berjalan.get(key);
      if (jalan) return jalan;

      const p = fn(key).then(
        (data) => {
          // Map mempertahankan urutan penyisipan, jadi kunci pertama adalah
          // yang terlama. Dibuang satu per satu, bukan mengosongkan semuanya.
          while (tersimpan.size >= maxEntri) {
            const terlama = tersimpan.keys().next().value;
            if (terlama === undefined) break;
            tersimpan.delete(terlama);
          }
          tersimpan.set(key, { at: Date.now(), data });
          berjalan.delete(key);
          return data;
        },
        (err) => {
          // Kegagalan tidak disimpan: percobaan berikutnya harus mencoba lagi,
          // bukan mengulang error yang sama selama masa berlaku.
          berjalan.delete(key);
          throw err;
        },
      );

      berjalan.set(key, p);
      return p;
    },

    clear(key) {
      if (key === undefined) {
        tersimpan.clear();
        berjalan.clear();
        return;
      }
      tersimpan.delete(key);
      berjalan.delete(key);
    },
  };
}
