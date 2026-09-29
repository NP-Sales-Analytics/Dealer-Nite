import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Redis-nya di N. Virginia (batas free tier, tidak bisa dipindah), sementara
// fungsi berjalan di Seoul. Itu biaya tetap yang harus dibayar tiap panggilan -
// uji beban 250 VU membuktikannya justru menjadi bagian TERBESAR dari waktu
// Endpoint mutasi: ~325ms rata-rata di bawah beban serentak (sampai ~490ms
// saat banyak instance Vercel baru dinyalakan bersamaan dan masing-masing
// membayar koneksi dingin penuh ke Upstash), turun ke ~195ms begitu instance-nya
// hangat - tapi tidak pernah kembali ke ~227ms datar yang terukur tanpa beban.
// Transaksi Postgres yang sebenarnya (lock+select+insert) cuma ~43ms; pool
// koneksi DB bukan titik sempitnya (lihat lib/db/index.ts).
//
// ponytail: diterima apa adanya untuk sekarang - memindahkan state rate-limit
// ke Postgres (co-located, sudah terbukti cepat) akan menghilangkan biaya ini,
// tapi itu perubahan arsitektur, bukan tweak satu baris. Naikkan kalau nanti
// p95 malam event benar-benar mepet ambang karena ini.

const configured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const limiter = configured
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(40, '10 s'),
      prefix: 'dealer-nite',
      analytics: false,
    })
  : null;

// ponytail: tanpa env var Upstash, semua request diloloskan. Isi env var di Vercel
// untuk mengaktifkan tanpa perubahan kode.
export async function rateLimit(key: string): Promise<{ ok: boolean }> {
  if (!limiter) return { ok: true };
  const { success } = await limiter.limit(key);
  return { ok: success };
}
