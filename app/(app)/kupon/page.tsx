import { KuponClient } from '@/components/kupon/kupon-client';
import { bisaKelolaKupon } from '@/lib/access';
import { requireHalaman } from '@/lib/auth';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function KuponPage() {
  const user = await requireHalaman('/kupon');
  const dealerNights = await dealerNightOptionsFor(user);
  return (
    <div className="mx-auto w-full max-w-7xl">
      <KuponClient
        dealerNights={dealerNights}
        canManage={bisaKelolaKupon(user)}
        canExport={user.role !== 'dn_user'}
      />
    </div>
  );
}
