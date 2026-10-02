import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/shared/app-header';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { QueryProvider } from '@/components/shared/query-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getSessionUser } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Otorisasi per-halaman tetap di page.tsx masing-masing (requireRole).
  // Di sini hanya dibutuhkan identitas untuk mengisi sidebar.
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    // key={user.id}: QueryClient dibuat sekali per mount. Login/logout di App
    // Router adalah navigasi sisi klien, jadi tanpa key ini React akan memakai
    // ulang provider yang sama dan user berikutnya mewarisi cache milik user
    // sebelumnya - termasuk daftar filter yang sudah dipersempit cakupan datanya.
    <QueryProvider key={user.id}>
    {/* TooltipProvider dibutuhkan saat sidebar diciutkan: yang tersisa hanya ikon,
        dan namanya muncul sebagai tooltip. */}
    <TooltipProvider>
    {/* Navigasi tertutup secara bawaan supaya konten memakai layar penuh. */}
    <SidebarProvider defaultOpen={false}>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0 bg-background">
        {/* Header judul halaman menempel di atas saat digulung, sejajar dengan
            header sidebar. Di HP ia menggantikan wordmark Nippon: nama halaman
            lebih berguna daripada merek yang sudah terlihat di drawer. */}
        <AppHeader />
        {/* flex flex-col: halaman yang punya bar aksi menempel butuh tinggi
            yang bisa diisi penuh, supaya barnya jatuh ke dasar layar walau
            isinya pendek. Halaman lain tidak terpengaruh - anak tunggal di
            kolom fleks tetap mengalir seperti biasa. */}
        <div className="flex min-w-0 flex-1 flex-col p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
    </QueryProvider>
  );
}
