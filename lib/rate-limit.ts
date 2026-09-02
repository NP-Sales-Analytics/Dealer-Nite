import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const configured =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const limiter = configured
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(40, '10 s'),
      prefix: 'pylox',
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
