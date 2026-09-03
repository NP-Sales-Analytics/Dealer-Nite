import { redirect } from 'next/navigation';
import { OrderClient } from '@/components/order/order-client';
import { QueryProvider } from '@/components/shared/query-provider';
import { getCustomerId } from '@/lib/order-session';

export default async function OrderPage() {
  const customerId = await getCustomerId();
  if (!customerId) redirect('/order/login');
  return (
    <QueryProvider>
      <OrderClient />
    </QueryProvider>
  );
}
