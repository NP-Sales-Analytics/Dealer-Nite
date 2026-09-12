import { asc } from 'drizzle-orm';
import { UserTable } from '@/components/admin/user-table';
import { requireHalaman } from '@/lib/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { semuaRegion } from '@/lib/dashboard/hierarchy';

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
      dataScope: profiles.dataScope,
    })
    .from(profiles)
    .orderBy(asc(profiles.fullName));

  return (
    <div className="mx-auto w-full max-w-6xl">
      <UserTable rows={rows} currentUserId={me.id} regionOptions={semuaRegion()} />
    </div>
  );
}
