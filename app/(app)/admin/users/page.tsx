import { asc, eq, or, sql } from 'drizzle-orm';
import { UserTable } from '@/components/admin/user-table';
import { canReadDealerNight, superAdminPusat } from '@/lib/access';
import { requireHalaman } from '@/lib/auth';
import { db } from '@/lib/db';
import { dealerNights, profiles } from '@/lib/db/schema';
import { depotDealerNight } from '@/lib/target/dealer-night-options';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const me = await requireHalaman('/admin/users');
  const pusat = superAdminPusat(me);
  // Kolom eksplisit: password_hash TIDAK boleh ikut - ini dikirim ke komponen klien.
  // Selain Super Admin pusat, yang terlihat hanya akun sendiri dan user buatannya.
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
      wilayah: profiles.wilayah,
    })
    .from(profiles)
    .where(pusat ? undefined : or(eq(profiles.id, me.id), eq(profiles.createdBy, me.id)))
    .orderBy(asc(profiles.fullName));

  const dnRows = (await db
    .select({ id: dealerNights.id, name: dealerNights.name, depotCodes: dealerNights.depotCodes })
    .from(dealerNights)
    .orderBy(sql`${dealerNights.eventDate} is null`, asc(dealerNights.eventDate), asc(dealerNights.name)))
    .filter((row) => canReadDealerNight(me, row.id));
  const depots = await depotDealerNight(dnRows);
  const dealerNightOptions = dnRows.map((row) => ({ id: row.id, name: row.name, depots: depots.get(row.id) ?? [] }));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <UserTable rows={rows} currentUserId={me.id} pusat={pusat} dealerNightOptions={dealerNightOptions} />
    </div>
  );
}
