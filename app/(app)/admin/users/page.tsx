import { asc } from 'drizzle-orm';
import { CreateUserDialog } from '@/components/admin/create-user-dialog';
import { UserTable } from '@/components/admin/user-table';
import { PageHeader } from '@/components/shared/page-header';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const me = await requireRole(['superadmin']);
  const rows = await db.select().from(profiles).orderBy(asc(profiles.email));

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Manajemen User"
        subtitle={`${rows.length} akun terdaftar`}
        actions={<CreateUserDialog />}
      />
      <UserTable rows={rows} currentUserId={me.id} />
    </div>
  );
}
