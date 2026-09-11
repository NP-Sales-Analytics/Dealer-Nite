import { PaxTargetForm } from '@/components/setting/pax-target-form';
import { requireHalaman } from '@/lib/auth';
import { bacaDaftarTargetPax } from '@/lib/pax-targets';

export const dynamic = 'force-dynamic';

export default async function SettingPaxPage() {
  await requireHalaman('/setting/pax');
  const depots = await bacaDaftarTargetPax();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PaxTargetForm depots={depots} />
    </div>
  );
}

