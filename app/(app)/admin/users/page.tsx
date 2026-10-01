import { asc, sql } from 'drizzle-orm';
import { UserTable } from '@/components/admin/user-table';
import { requireHalaman } from '@/lib/auth';
import { db } from '@/lib/db';
import { dealerNights, profiles } from '@/lib/db/schema';
import { depotDealerNight } from '@/lib/target/dealer-night-options';

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
      dealerNightIds: profiles.dealerNightIds,
      depotCodes: profiles.depotCodes,
    })
    .from(profiles)
    .orderBy(asc(profiles.fullName));

  const dnRows = await db
    .select({ id: dealerNights.id, name: dealerNights.name, depotCodes: dealerNights.depotCodes })
    .from(dealerNights)
    .orderBy(sql`${dealerNights.eventDate} is null`, asc(dealerNights.eventDate), asc(dealerNights.name));
  const depots = await depotDealerNight(dnRows);
  const dealerNightOptions = dnRows.map((row) => ({ id: row.id, name: row.name, depots: depots.get(row.id) ?? [] }));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <UserTable rows={rows} currentUserId={me.id} dealerNightOptions={dealerNightOptions} />
    </div>
  );
}
