'use client';

import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { useActionState, useState } from 'react';
import { signIn } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);
  const [show, setShow] = useState(false);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <Image
          src="/logo-nippon-full.png"
          alt="Nippon Paint"
          width={2288}
          height={681}
          priority
          className="mx-auto h-auto w-48"
        />

        <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight">
          Masuk ke Nippon
        </h1>
        <p className="mx-auto mt-1.5 mb-6 max-w-[17rem] text-center text-sm text-muted-foreground">
          Akses khusus tim internal Dealer Night.
        </p>

        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="credential">Password</Label>
            <div className="relative">
              <Input
                id="credential"
                name="credential"
                required
                type={show ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Masukkan password"
                className="h-12 pr-12"
              />
              {/* Di HP orang sering salah ketik dan tidak punya cara memeriksanya. */}
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Sembunyikan' : 'Tampilkan'}
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

          <Button type="submit" className="mt-2 h-12 w-full text-base" disabled={pending}>
            {pending ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>
      </div>
    </main>
  );
}
