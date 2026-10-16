'use client';

import {
  ClipboardCheck, PanelLeftClose, ClipboardList, Gauge, LayoutDashboard, ListChecks,
  LogOut, Ticket, Trophy, Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, type ComponentType } from 'react';
import { signOut } from '@/app/(auth)/login/actions';
import { Brand } from '@/components/shared/brand';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import { halamanEfektif } from '@/lib/access';
import type { SessionUser } from '@/lib/auth';

type NavLink = { href: string; label: string; icon: ComponentType<{ className?: string }> };

// Dikelompokkan per urusan, bukan satu daftar panjang: begitu "Setting" berisi
// lebih dari satu halaman, tanpa grup menu operasional harian ikut tenggelam.
//
// Label di sini harus sama dengan lib/access.ts - yang ini untuk navigasi,
// yang di sana untuk daftar pilihan di User Management.
const GRUP: { label: string; links: NavLink[] }[] = [
  {
    label: 'Kehadiran',
    links: [
      { href: '/dashboard', label: 'Dashboard Kehadiran', icon: LayoutDashboard },
      { href: '/reservation', label: 'Pencatatan Kehadiran', icon: ClipboardCheck },
      { href: '/kehadiran', label: 'Detail Toko Hadir', icon: ListChecks },
    ],
  },
  {
    label: 'Target DN',
    links: [
      { href: '/leaderboard', label: 'Leaderboard Target DN', icon: Trophy },
      { href: '/order/detail', label: 'Detail Target DN', icon: ClipboardList },
      { href: '/kupon', label: 'Detail Kupon', icon: Ticket },
    ],
  },
  {
    label: 'Setting',
    links: [
      { href: '/admin/users', label: 'User Management', icon: Users },
      { href: '/setting/pax', label: 'Setting Target DN', icon: Gauge },
    ],
  },
];

/** Semua href menu, untuk mencari awalan terpanjang yang cocok. */
const SEMUA_HREF = GRUP.flatMap((g) => g.links.map((l) => l.href));

const initials = (user: SessionUser) =>
  (user.fullName || user.email).trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const { setOpen, setOpenMobile, toggleSidebar } = useSidebar();

  // Navigasi hanya dibuka saat perlu: setiap pindah halaman ia menutup lagi.
  // Lewat ref, karena setOpen bawaan sidebar berganti identitas tiap kali
  // status buka berubah - kalau dijadikan dependensi, membuka sidebar langsung
  // memicu efek ini dan menutupnya kembali.
  const tutup = useRef(() => {});
  tutup.current = () => { setOpen(false); setOpenMobile(false); };
  useEffect(() => {
    tutup.current();
  }, [pathname]);
  // Menu mengikuti halaman yang diizinkan untuk akun ini, bukan rolenya:
  // superadmin bisa mencabut satu halaman tanpa mengganti role orangnya.
  const boleh = halamanEfektif(user.role, user.allowedPages);
  // Awalan terpanjang yang menang: tanpa ini /order/detail ikut menyalakan
  // /order, karena keduanya sama-sama cocok sebagai awalan.
  const hrefAktif = SEMUA_HREF
    .filter((h) => pathname === h || pathname.startsWith(h + '/'))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <Sidebar collapsible="icon" className="z-40">
      <SidebarHeader className="h-17 shrink-0 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        {/* Saat terbuka, tombol tutup ada di dalam sidebar; saat tertutup
            pindah ke header (lihat AppHeader). */}
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
          <Brand />
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Tutup navigasi"
            title="Tutup navigasi"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <PanelLeftClose className="size-4.5" strokeWidth={1.75} />
          </button>
        </div>
        <Image
          src="/logo-nippon.png"
          alt="Nippon Paint"
          width={32}
          height={32}
          className="hidden shrink-0 group-data-[collapsible=icon]:block"
        />
      </SidebarHeader>

      <SidebarContent>
        {GRUP.map((grup) => {
          const tampil = grup.links.filter((l) => boleh.includes(l.href));
          // Grup yang seluruh isinya tertutup untuk role ini tidak perlu
          // menyisakan judul kosong.
          if (tampil.length === 0) return null;

          return (
            <SidebarGroup key={grup.label}>
              <SidebarGroupLabel className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
                {grup.label}
              </SidebarGroupLabel>
              <SidebarMenu>
                {tampil.map((l) => {
                  const active = l.href === hrefAktif;
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
                        // Bar aksen kiri lewat inset shadow: ikut melengkung mengikuti
                        // sudut tombol, tanpa elemen tambahan.
                        className="h-11 gap-3 rounded-lg text-[0.9375rem] font-semibold data-active:font-semibold data-active:shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                      >
                        <l.icon className="size-5 shrink-0" />
                        <span>{l.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
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
