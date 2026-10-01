import { CheckinForm } from '@/components/reservation/checkin-form';
import { requireHalaman } from '@/lib/auth';
import { dealerNightOptionsFor } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function ReservationPage() {
  const user = await requireHalaman('/reservation');
  const dealerNights = await dealerNightOptionsFor(user);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <CheckinForm dealerNights={dealerNights} />
    </div>
  );
}
