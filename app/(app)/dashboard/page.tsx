import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { requireHalaman } from '@/lib/auth';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireHalaman('/dashboard');
  const dealerNights = await dealerNightOptionsFor(user);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <DashboardClient dealerNights={dealerNights} />
    </div>
  );
}
