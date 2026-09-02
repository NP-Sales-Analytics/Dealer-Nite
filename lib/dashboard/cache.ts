// Cache 15 detik untuk agregat dashboard.
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
// Konsekuensinya N instance = N query per 15 detik, bukan 1. Untuk 3 endpoint dan
// data sekecil ini itu beberapa query per detik - tidak perlu diperbaiki kecuali
// jumlah instance benar-benar meledak.
export function cache15s<T>(fn: () => Promise<T>): () => Promise<T> {
  let hit: { at: number; data: T } | null = null;
  let inflight: Promise<T> | null = null;

  return async () => {
    if (hit && Date.now() - hit.at < 15_000) return hit.data;
    if (inflight) return inflight;

    inflight = fn().then(
      (data) => { hit = { at: Date.now(), data }; inflight = null; return data; },
      (err) => { inflight = null; throw err; },
    );
    return inflight;
  };
}
