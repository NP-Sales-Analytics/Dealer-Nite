'use client';

import { ArrowRight, Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import Image from 'next/image';
import { useActionState, useState } from 'react';
import { signIn } from './actions';
import { Label } from '@/components/ui/label';

const inputClass =
  'h-12 w-full rounded-xl border border-border bg-white pl-11 text-[15px] text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none';

/** Latar dekoratif: gelombang biru lembut seperti kain, murni hiasan. */
function Latar() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#f7faff] via-[#eef4ff] to-[#dce8ff]" />
      <svg className="absolute inset-0 size-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="gel-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#465fff" stopOpacity="0.05" />
            <stop offset="1" stopColor="#465fff" stopOpacity="0.28" />
          </linearGradient>
          <linearGradient id="gel-b" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b82f6" stopOpacity="0.32" />
            <stop offset="1" stopColor="#93c5fd" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {/* kiri bawah */}
        <path d="M0 470 C 260 420 460 560 620 900 L 0 900 Z" fill="url(#gel-a)" />
        <path d="M0 640 C 220 600 420 690 560 900 L 0 900 Z" fill="url(#gel-a)" />
        {/* kanan atas */}
        <path d="M980 0 C 1120 180 1260 260 1440 250 L 1440 0 Z" fill="url(#gel-b)" />
        <path d="M1180 0 C 1260 120 1340 520 1440 760 L 1440 0 Z" fill="url(#gel-b)" />
        {/* garis cahaya tipis */}
        <path d="M-40 780 C 260 520 520 520 700 620" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.5" />
        <path d="M760 40 C 1000 200 1200 300 1480 250" fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export default function LoginPage() {
  const [error, action, pending] = useActionState(signIn, null);
  const [show, setShow] = useState(false);

  return (
    <main className="relative flex min-h-svh items-center justify-center p-4 sm:p-6">
      <Latar />

      <div className="relative w-full max-w-md rounded-3xl border border-white/80 bg-white/90 px-6 py-9 shadow-[0_24px_60px_-20px_rgb(30_64_175/0.25)] backdrop-blur-sm sm:px-10 sm:py-11">
        <Image
          src="/logo-nippon-full.png"
          alt="Nippon Paint"
          width={2288}
          height={681}
          priority
          className="mx-auto h-auto w-44 sm:w-52"
        />

        <h1 className="mt-7 text-center text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
          DN Administration System
        </h1>
        <p className="mx-auto mt-2 mb-8 max-w-xs text-center text-sm text-muted-foreground">
          Portal untuk pengelolaan Operational Dealer Nite
        </p>

        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-semibold">Username</Label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                id="username"
                name="username"
                required
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Masukkan username"
                className={`${inputClass} pr-4`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                id="password"
                name="password"
                required
                type={show ? 'text' : 'password'}
                autoComplete="off"
                placeholder="Masukkan password"
                className={`${inputClass} pr-12`}
              />
              {/* Di HP orang sering salah ketik dan tidak punya cara memeriksanya. */}
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
                className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-primary to-accent-foreground text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-110 active:translate-y-px focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none disabled:opacity-60"
          >
            {pending ? 'Memproses...' : (
              <>
                Masuk ke Sistem
                <ArrowRight className="size-5" aria-hidden />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
