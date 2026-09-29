import { TargetDetail } from '@/components/target/target-detail';
import { requireHalaman } from '@/lib/auth';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function DetailTargetPage() {
  const user = await requireHalaman('/order/detail');
  const dealerNights = await dealerNightOptionsFor(user);
  return (
    <div className="mx-auto w-full max-w-7xl">
      <TargetDetail
        dealerNights={dealerNights}
        initialDealerNightId={user.dealerNightId ?? dealerNights[0]?.id ?? ''}
        fixedDealerNight={user.role === 'dn_user'}
        canAdjust={user.role === 'superadmin' || user.role === 'admin'}
        canExport={user.role !== 'dn_user'}
      />
    </div>
  );
}
