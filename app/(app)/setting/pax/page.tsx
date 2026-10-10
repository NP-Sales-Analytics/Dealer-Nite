import { PaxTargetForm } from '@/components/setting/pax-target-form';
import { requireHalaman } from '@/lib/auth';
import { dealerNightOptionsFor, dnTampilanAwal } from '@/lib/target/dealer-night-options';
import { WILAYAH } from '@/lib/target/dn-bawaan';

export const dynamic = 'force-dynamic';

export default async function SettingPaxPage() {
  const user = await requireHalaman('/setting/pax');
  const [rows, dnAwal] = await Promise.all([dealerNightOptionsFor(user), dnTampilanAwal()]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PaxTargetForm
        rows={rows}
        dnAwal={dnAwal}
        // Super Admin pusat mengatur semua wilayah; Super Admin wilayah hanya wilayahnya.
        wilayahDikelola={user.role !== 'superadmin' ? [] : user.wilayah ? WILAYAH.filter((w) => w === user.wilayah) : [...WILAYAH]}
      />
    </div>
  );
}
