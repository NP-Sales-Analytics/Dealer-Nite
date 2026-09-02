import Link from 'next/link';
import { signOut } from '@/app/(auth)/login/actions';
import type { SessionUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';

const LINKS: { href: string; label: string; roles: SessionUser['role'][] }[] = [
  { href: '/reservation', label: 'Pencatatan', roles: ['superadmin', 'admin_rsvp'] },
  { href: '/dashboard', label: 'Dashboard', roles: ['superadmin', 'rsm'] },
  { href: '/admin/users', label: 'User', roles: ['superadmin'] },
];

export function AppNav({ user }: { user: SessionUser }) {
  return (
    <header className="flex items-center gap-4 border-b bg-background px-4 py-3">
      <span className="font-semibold">Pylox</span>
      <nav className="flex gap-3 text-sm">
        {LINKS.filter((l) => l.roles.includes(user.role)).map((l) => (
          <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">{user.email}</span>
        <form action={signOut}>
          <Button variant="outline" size="sm">Keluar</Button>
        </form>
      </div>
    </header>
  );
}
