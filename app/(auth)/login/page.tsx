'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useActionState, useState } from 'react';
import { signIn } from './actions';
import { Brand } from '@/components/shared/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);
  const [show, setShow] = useState(false);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand size="lg" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
          <h1 className="text-xl font-semibold tracking-tight">Masuk ke Pylox</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Gunakan email dan password yang terdaftar.
          </p>

          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email" name="email" type="email" required
                autoComplete="email" inputMode="email" placeholder="nama@perusahaan.com"
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password" name="password" required
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password" placeholder="Masukkan password"
                  className="h-12 pr-12"
                />
                {/* Di HP orang sering salah ketik password dan tidak punya cara memeriksanya. */}
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="h-12 w-full text-base" disabled={pending}>
              {pending ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
