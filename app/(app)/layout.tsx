import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/shared/app-sidebar';
import { Brand } from '@/components/shared/brand';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getSessionUser } from '@/lib/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Otorisasi per-halaman tetap di page.tsx masing-masing (requireRole).
  // Di sini hanya dibutuhkan identitas untuk mengisi sidebar.
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    // TooltipProvider dibutuhkan saat sidebar diciutkan: yang tersisa hanya ikon,
    // dan namanya muncul sebagai tooltip.
    <TooltipProvider>
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0 bg-background">
        {/* Hanya di HP: sidebar tersembunyi, jadi wordmark dan tombol menu
            pindah ke sini. Di desktop judul halaman sudah ada di area konten. */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card px-3 md:hidden">
          <SidebarTrigger className="size-10" />
          <Brand subtitle={null} />
        </header>
        <div className="min-w-0 flex-1 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  );
}
