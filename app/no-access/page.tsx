import { ShieldOff } from 'lucide-react';
import { signOut } from '@/app/(auth)/login/actions';
import { Brand } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';

export default function NoAccessPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4 text-center">
      <Brand size="lg" />
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xs">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary text-muted-foreground">
          <ShieldOff className="size-6" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">Tidak punya akses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Akun Anda belum diberi izin untuk halaman ini. Hubungi superadmin bila ini keliru.
        </p>
        <form action={signOut} className="mt-5">
          <Button variant="outline" className="h-11 w-full">Keluar</Button>
        </form>
      </div>
    </main>
  );
}
