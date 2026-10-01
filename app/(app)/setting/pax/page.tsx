import { PaxTargetForm } from '@/components/setting/pax-target-form';
import { requireHalaman } from '@/lib/auth';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function SettingPaxPage() {
  const user = await requireHalaman('/setting/pax');
  const rows = await dealerNightOptionsFor(user);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PaxTargetForm rows={rows} />
    </div>
  );
}
