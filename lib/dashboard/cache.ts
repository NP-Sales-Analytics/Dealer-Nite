// Cache 15 detik untuk agregat dashboard, dipisahkan per kombinasi filter.
//
// Dipakai menggantikan unstable_cache: query aslinya terukur ~90ms lewat pooler,
// tapi dibungkus unstable_cache endpoint-nya jadi 10-20 detik di dev mode.
// Memo ini berperilaku sama di dev maupun produksi.
//
// Dedup in-flight adalah bagian pentingnya: saat cache dingin dan 100 admin
// membuka dashboard bersamaan, semuanya berbagi SATU query, bukan 100 query
// yang antre di koneksi max:1.
//
// ponytail: cache per-instance, bukan lintas-instance seperti Vercel Data Cache.
// Konsekuensinya N instance = N query per 15 detik, bukan 1. Untuk data sekecil
// ini itu beberapa query per detik - tidak perlu diperbaiki kecuali jumlah
// instance benar-benar meledak.
const TTL_MS = 15_000;
// Kombinasi filter terbatas (region x depot), tapi tetap dibatasi supaya map
// tidak tumbuh tanpa henti kalau ada parameter tak terduga.
const MAX_ENTRI = 200;

export function cache15s<T>(fn: (key: string) => Promise<T>): (key?: string) => Promise<T> {
  const hit = new Map<string, { at: number; data: T }>();
  const inflight = new Map<string, Promise<T>>();

  return async (key = '') => {
    const segar = hit.get(key);
    if (segar && Date.now() - segar.at < TTL_MS) return segar.data;

    const jalan = inflight.get(key);
    if (jalan) return jalan;

    const p = fn(key).then(
      (data) => {
        if (hit.size >= MAX_ENTRI) hit.clear();
        hit.set(key, { at: Date.now(), data });
        inflight.delete(key);
        return data;
      },
      (err) => {
        inflight.delete(key);
        throw err;
      },
    );
    inflight.set(key, p);
    return p;
  };
}
