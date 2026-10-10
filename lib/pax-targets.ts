import { eq } from 'drizzle-orm';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { db } from '@/lib/db';
import { dealerNights } from '@/lib/db/schema';
import type { KonfigKupon } from '@/lib/target/kupon';
import { targetPaxListSchema, type TargetPaxItem } from '@/lib/validations/pax-target';

export type DealerNightTargetPax = {
  id: string; name: string; targetPax: number; targetDn: number; eventDate?: string | null; kupon: KonfigKupon;
  /** Wilayah DN (dari hierarki depotnya), untuk filter di Setting Target DN. */
  wilayah?: string | null;
  /** DN tampilan awal pilihan Super Admin. */
  bawaan?: boolean;
};

export async function bacaTargetPax(dealerNightId: string): Promise<number> {
  const [row] = await db.select({ targetPax: dealerNights.targetPax })
    .from(dealerNights).where(eq(dealerNights.id, dealerNightId)).limit(1);
  return row?.targetPax ?? 0;
}

/** Pemanggil wajib sudah memastikan user boleh mengakses tiap Dealer Night. */
export async function simpanTargetPax(input: TargetPaxItem[]) {
  const parsed = targetPaxListSchema.parse(input);
  await db.transaction(async (tx) => {
    for (const item of parsed) {
      await tx.update(dealerNights).set({
        targetPax: item.targetPax, targetDn: item.targetDn,
        nilaiKuponPink: item.nilaiKuponPink, nilaiKuponHijau: item.nilaiKuponHijau,
      })
        .where(eq(dealerNights.id, item.dealerNightId));
    }
  });
  bersihkanCacheDashboard();
}
