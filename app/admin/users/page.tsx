import { asc } from 'drizzle-orm';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { UserTable } from '@/components/admin/user-table';
import { AppNav } from '@/components/shared/app-nav';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const me = await requireRole(['superadmin']);
  const rows = await db.select().from(profiles).orderBy(asc(profiles.email));

  return (
    <>
      <AppNav user={me} />
      <main className="mx-auto w-full max-w-4xl space-y-4 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Manajemen User</h1>
          <CreateUserDialog />
        </div>
        <UserTable rows={rows} currentUserId={me.id} />
      </main>
    </>
  );
}
