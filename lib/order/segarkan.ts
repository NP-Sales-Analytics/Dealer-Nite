import { lupakanCustomer } from '@/lib/auth';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { papan } from '@/lib/order/papan';

/**
 * Semua cache yang ikut basi setelah master atau ledger sebuah toko berubah:
 * identitas seluruh toko (60 detik), papan peringkat, dan daftar Detail Order
 * beserta filternya (cacheDashboard).
 */
export function segarkanOrder() {
  lupakanCustomer();
  papan.clear();
  bersihkanCacheDashboard();
}
