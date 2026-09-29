import { PaxTargetForm } from '@/components/setting/pax-target-form';
import { requireHalaman } from '@/lib/auth';
import { bacaDaftarTargetPax } from '@/lib/pax-targets';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function SettingPaxPage() {
  const user = await requireHalaman('/setting/pax');
  const dealerNights = await dealerNightOptionsFor(user);
  const dealerNightId = user.dealerNightId ?? dealerNights[0]?.id ?? '';
  const depots = dealerNightId ? await bacaDaftarTargetPax(dealerNightId) : [];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PaxTargetForm depots={depots} dealerNightId={dealerNightId} />
    </div>
  );
}

