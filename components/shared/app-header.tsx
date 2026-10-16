'use client';

import { PanelLeftOpen } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/components/ui/sidebar';

/**
 * Judul diambil dari rute, bukan dikirim tiap halaman.
 *
 * Header ini hidup di layout supaya bisa menempel saat digulung, sementara
 * page.tsx adalah server component yang di-render di dalamnya - mengoper judul
 * ke atas butuh context atau portal, sedangkan pemetaan rute sudah cukup dan
 * tetap satu sumber kebenaran dengan label di sidebar.
 */
const JUDUL: { awalan: string; judul: string; keterangan: string }[] = [
  {
    awalan: '/dashboard',
    judul: 'Dashboard Kehadiran',
    keterangan: 'Rekap kehadiran tamu undangan, diperbarui otomatis tiap 10 detik.',
  },
  {
    awalan: '/reservation',
    judul: 'Pencatatan Kehadiran',
    keterangan: 'Cari toko dengan nama, kode toko, atau no undian, lalu isi jumlah orang yang hadir.',
  },
  {
    awalan: '/kehadiran',
    judul: 'Detail Toko Hadir',
    keterangan: 'Daftar toko yang sudah tercatat hadir. Cari, saring, dan koreksi bila perlu.',
  },
  {
    awalan: '/leaderboard',
    judul: 'Leaderboard Target DN',
    keterangan: 'Peringkat toko yang targetnya sudah diverifikasi, dari Target DN terbesar.',
  },
  {
    awalan: '/order/detail',
    judul: 'Detail Target DN',
    keterangan: 'Master toko, target awal, target efektif, dan riwayat penyesuaian.',
  },
  {
    awalan: '/kupon',
    judul: 'Detail Kupon',
    keterangan: 'Hak, pembuatan, dan pemberian kupon undian untuk setiap toko.',
  },
  {
    awalan: '/setting/pax',
    judul: 'Setting Target DN',
    keterangan: 'Atur Total Target DN, target pax, dan pembagi kupon untuk setiap Dealer Night.',
  },
  {
    awalan: '/admin/users',
    judul: 'User Management',
    keterangan: 'Kelola akun, halaman yang bisa diakses, dan cakupan datanya.',
  },
];

export function AppHeader() {
  const pathname = usePathname();
  const { isMobile, state, toggleSidebar } = useSidebar();
  // Yang terpanjang menang: '/admin/users' harus kalah-kan '/admin' seandainya
  // nanti ada halaman admin lain.
  const aktif = JUDUL
    .filter((j) => pathname === j.awalan || pathname.startsWith(j.awalan + '/'))
    .sort((a, b) => b.awalan.length - a.awalan.length)[0];

  return (
    // h-17 menyamai tinggi header sidebar, sehingga garis bawah keduanya
    // menyambung jadi satu garis lurus di desktop.
    //
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:h-17 md:px-6">
      {/* Tombol buka navigasi: di HP selalu (drawer), di desktop hanya saat
          sidebar tertutup - saat terbuka tombol tutupnya ada di dalam sidebar. */}
      {(isMobile || state === 'collapsed') && (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Buka navigasi"
          title="Buka navigasi"
          className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/5 text-primary transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <PanelLeftOpen className="size-5" strokeWidth={1.75} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold leading-tight tracking-tight md:text-lg">
          {aktif?.judul ?? 'Dealer Nite'}
        </h1>
        {/* Keterangan disembunyikan di HP: tinggi header dua baris memakan
            ruang daftar yang justru jadi isi utama halaman. */}
        {aktif?.keterangan && (
          <p className="mt-0.5 hidden truncate text-xs text-muted-foreground md:block">
            {aktif.keterangan}
          </p>
        )}
      </div>
    </header>
  );
}
