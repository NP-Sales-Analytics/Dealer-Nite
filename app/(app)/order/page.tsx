import { OrderClient } from '@/components/order/order-client';
import { StaffOrderClient } from '@/components/order/staff-order-client';
import { requireHalaman } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function OrderPage() {
  const user = await requireHalaman('/order');
  // Customer: self-service order miliknya. Staff: catat atas nama toko (cari dulu).
  return user.role === 'customer' ? <OrderClient /> : <StaffOrderClient />;
}
