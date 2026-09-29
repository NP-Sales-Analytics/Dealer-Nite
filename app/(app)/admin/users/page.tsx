import { asc, eq } from 'drizzle-orm';
import { UserTable } from '@/components/admin/user-table';
import { requireHalaman } from '@/lib/auth';
import { db } from '@/lib/db';
import { dealerNights, profiles } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const me = await requireHalaman('/admin/users');
  // Kolom eksplisit: password_hash TIDAK boleh ikut - ini dikirim ke komponen klien.
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      fullName: profiles.fullName,
      role: profiles.role,
      allowedPages: profiles.allowedPages,
      bolehUnduh: profiles.bolehUnduh,
      dealerNightId: profiles.dealerNightId,
      dealerNightName: dealerNights.name,
    })
    .from(profiles)
    .leftJoin(dealerNights, eq(profiles.dealerNightId, dealerNights.id))
    .orderBy(asc(profiles.fullName));

  const dealerNightOptions = await db
    .select({ id: dealerNights.id, name: dealerNights.name })
    .from(dealerNights)
    .orderBy(asc(dealerNights.name));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <UserTable rows={rows} currentUserId={me.id} dealerNightOptions={dealerNightOptions} />
    </div>
  );
}
