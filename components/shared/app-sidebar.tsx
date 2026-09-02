'use client';

import { ClipboardCheck, LayoutDashboard, LogOut, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';
import { signOut } from '@/app/(auth)/login/actions';
import { Brand } from '@/components/shared/brand';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import type { Role, SessionUser } from '@/lib/auth';

// Mapping role -> menu dipertahankan persis seperti sebelumnya (lihat riwayat
// app-nav.tsx); yang bertambah hanya ikon.
const LINKS: { href: string; label: string; icon: ComponentType<{ className?: string }>; roles: Role[] }[] = [
  { href: '/reservation', label: 'Pencatatan', icon: ClipboardCheck, roles: ['superadmin', 'admin_rsvp'] },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'rsm'] },
  { href: '/admin/users', label: 'User', icon: Users, roles: ['superadmin'] },
];

const initials = (user: SessionUser) =>
  (user.fullName || user.email).trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Brand />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {LINKS.filter((l) => l.roles.includes(user.role)).map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + '/');
              return (
                <SidebarMenuItem key={l.href}>
                  <SidebarMenuButton
                    // shadcn build ini memakai base-ui: komposisi lewat `render`,
                    // bukan `asChild`.
                    render={<Link href={l.href} />}
                    isActive={active}
                    // Tutup drawer setelah memilih menu; tanpa ini drawer tetap
                    // menutupi halaman tujuan di HP.
                    onClick={() => setOpenMobile(false)}
                    className="h-11 gap-3 text-[15px]"
                  >
                    <l.icon className="size-5 shrink-0" />
                    <span>{l.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-2.5">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-accent-foreground"
            aria-hidden
          >
            {initials(user)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium leading-tight">
              {user.fullName || 'Pengguna'}
            </span>
            <span className="block truncate text-xs leading-tight text-muted-foreground">
              {user.email}
            </span>
          </span>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Keluar"
              title="Keluar"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
