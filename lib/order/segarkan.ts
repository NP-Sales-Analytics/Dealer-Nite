import { lupakanCustomer } from '@/lib/auth';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { papan } from '@/lib/order/papan';

/**
 * Semua cache yang ikut basi setelah master atau ledger sebuah toko berubah:
 * identitas toko (60 detik), papan peringkat (5 detik), dan daftar Detail Order
 * beserta filternya (cacheDashboard).
 */
export function segarkanOrder(id: string) {
  lupakanCustomer(id);
  papan.clear();
  bersihkanCacheDashboard();
}
