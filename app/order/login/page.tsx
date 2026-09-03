'use client';

import Image from 'next/image';
import { useActionState } from 'react';
import { loginCustomer } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function OrderLoginPage() {
  const [error, action, pending] = useActionState(loginCustomer, null);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <Image src="/logo-nippon-full.png" alt="Nippon Paint" width={2288} height={681} priority className="mx-auto h-auto w-48" />
        <h1 className="mt-5 text-center text-2xl font-semibold tracking-tight">Order Pylox</h1>
        <p className="mx-auto mt-1.5 mb-6 max-w-[17rem] text-center text-sm text-muted-foreground">
          Masukkan Kode SAP toko Anda untuk mulai mencatat.
        </p>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kodeSap">Kode SAP</Label>
            <Input id="kodeSap" name="kodeSap" required inputMode="numeric" autoComplete="off" placeholder="Contoh: 600001" className="h-12" />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
          <Button type="submit" className="mt-2 h-12 w-full text-base" disabled={pending}>
            {pending ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>
      </div>
    </main>
  );
}
