import { PaxTargetForm } from '@/components/setting/pax-target-form';
import { requireHalaman } from '@/lib/auth';
import { depotPerKode } from '@/lib/dashboard/hierarchy';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function SettingPaxPage() {
  const user = await requireHalaman('/setting/pax');
  const hierarki = depotPerKode();
  const rows = (await dealerNightOptionsFor(user)).map((row) => ({
    ...row,
    wilayah: row.depots.map((item) => hierarki.get(item.kode)?.wilayah).find(Boolean) ?? null,
  }));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PaxTargetForm rows={rows} />
    </div>
  );
}
