import { signOut } from '@/app/(auth)/login/actions';
import { Button } from '@/components/ui/button';

export default function NoAccessPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-2xl font-semibold">Tidak punya akses</h1>
      <p className="text-muted-foreground">Akun Anda belum diberi izin untuk halaman ini.</p>
      <form action={signOut}>
        <Button variant="outline">Keluar</Button>
      </form>
    </main>
  );
}
