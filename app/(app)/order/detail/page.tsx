import { TargetDetail } from '@/components/target/target-detail';
import { bolehHalaman, requireHalaman } from '@/lib/auth';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function DetailTargetPage() {
  const user = await requireHalaman('/order/detail');
  const dealerNights = await dealerNightOptionsFor(user);
  const pengelola = user.role === 'superadmin' || user.role === 'admin';
  return (
    <div className="mx-auto w-full max-w-7xl">
      <TargetDetail
        dealerNights={dealerNights}
        canAdjust={pengelola}
        canManage={pengelola}
        canExport={user.role !== 'dn_user'}
        canSetting={bolehHalaman(user, '/setting/pax')}
      />
    </div>
  );
}
