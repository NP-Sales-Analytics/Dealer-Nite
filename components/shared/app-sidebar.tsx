'use client';

import { ChevronLeft, ClipboardCheck, LayoutDashboard, ListChecks, LogOut, Users } from 'lucide-react';
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

// Mapping role -> menu; yang bertambah dari versi lama hanya ikon dan menu
// "Toko Hadir".
const LINKS: { href: string; label: string; icon: ComponentType<{ className?: string }>; roles: Role[] }[] = [
  { href: '/reservation', label: 'Pencatatan', icon: ClipboardCheck, roles: ['superadmin', 'admin_rsvp'] },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['superadmin', 'rsm'] },
  { href: '/kehadiran', label: 'Toko Hadir', icon: ListChecks, roles: ['superadmin', 'admin_rsvp', 'rsm'] },
  { href: '/admin/users', label: 'User', icon: Users, roles: ['superadmin'] },
];

const initials = (user: SessionUser) =>
  (user.fullName || user.email).trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const { setOpenMobile, toggleSidebar, state } = useSidebar();
  const tertutup = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      {/* Tombol collapse menempel di tengah tepi kanan sidebar, bukan di header:
          posisinya tetap sama baik sidebar terbuka maupun tertutup, jadi jalan
          keluarnya selalu di tempat yang sama. Desktop saja - di HP sidebar
          sudah berupa drawer dengan tombol sendiri di header. */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={tertutup ? 'Buka navigasi' : 'Tutup navigasi'}
        title={tertutup ? 'Buka navigasi' : 'Tutup navigasi'}
        className="absolute -right-3 top-1/2 z-20 hidden size-6 -translate-y-1/2 place-items-center rounded-full border border-sidebar-border bg-sidebar text-muted-foreground shadow-xs transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:grid"
      >
        <ChevronLeft className={`size-3.5 transition-transform ${tertutup ? 'rotate-180' : ''}`} />
      </button>

      <SidebarHeader className="border-b border-sidebar-border p-4 group-data-[collapsible=icon]:p-2">
        <div className="group-data-[collapsible=icon]:hidden">
          <Brand />
        </div>
        <span
          className="hidden size-9 place-items-center rounded-xl bg-primary text-base font-semibold text-primary-foreground group-data-[collapsible=icon]:grid"
          aria-hidden
        >
          P
        </span>
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
                    tooltip={l.label}
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

      <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 rounded-xl bg-secondary/60 p-2.5 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-accent-foreground"
            aria-hidden
            title={user.email}
          >
            {initials(user)}
          </span>
          <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <span className="block truncate text-sm font-medium leading-tight">
              {user.fullName || 'Pengguna'}
            </span>
            <span className="block truncate text-xs leading-tight text-muted-foreground">
              {user.email}
            </span>
          </span>
          <form action={signOut} className="group-data-[collapsible=icon]:hidden">
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
