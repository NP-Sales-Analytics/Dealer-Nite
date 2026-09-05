import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { appSettings } from '@/lib/db/schema';
import { ttlCache } from '@/lib/ttl-cache';

const KUNCI_TENGGAT = 'order_deadline';

/**
 * Tenggat penambahan order, disimpan sebagai ISO string.
 *
 * Dibaca di jalur panas (setiap /api/order/adjust dan ikut menumpang di payload
 * panel order), jadi dibungkus cache 30 detik: cukup segar untuk hitung mundur,
 * cukup murah untuk dipanggil tiap request.
 */
const cacheTenggat = ttlCache(async () => {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, KUNCI_TENGGAT))
    .limit(1);
  return row?.value ?? null;
}, 30_000);

/** ISO string tenggat, atau null bila belum diatur. */
export const bacaTenggat = () => cacheTenggat.get();

/** null = cabut tenggat. Cache dibersihkan supaya perubahan langsung berlaku. */
export async function simpanTenggat(iso: string | null) {
  if (iso === null) {
    await db.delete(appSettings).where(eq(appSettings.key, KUNCI_TENGGAT));
  } else {
    await db
      .insert(appSettings)
      .values({ key: KUNCI_TENGGAT, value: iso })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: iso, updatedAt: new Date() },
      });
  }
  cacheTenggat.clear();
}
