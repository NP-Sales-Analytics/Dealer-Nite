import { StaffOrderClient } from '@/components/order/staff-order-client';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Halaman staf saja. Customer tidak sampai ke sini - middleware mengalihkannya
 * ke /leaderboard, tempat penambahan ordernya sekarang menyatu dengan papan
 * peringkat. requireHalaman tetap jadi gerbang kerasnya: seandainya pengalihan
 * itu terlewat, /order memang bukan lagi halaman yang diizinkan untuk customer.
 */
export default async function OrderPage() {
  await requireHalaman('/order');
  return <StaffOrderClient />;
}
