'use client';

import { FileText, Pencil } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn, tanggalJakarta } from '@/lib/utils';

export type RiwayatForm = { id: string; jenis: 'verifikasi' | 'penyesuaian'; noFormulir: number | null; createdAt: string };

/** Baris "No. Formulir" di Data Toko; pensil membuka editor nomor tiap riwayat toko. */
export function NoFormulirRow({ customerId, riwayat, canEdit, onSaved }: {
  customerId: string;
  /** Urut terbaru dulu. */
  riwayat: RiwayatForm[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [nilai, setNilai] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const terakhir = riwayat[0]?.noFormulir;

  const buka = () => {
    setNilai(Object.fromEntries(riwayat.map((item) => [item.id, item.noFormulir == null ? '' : String(item.noFormulir)])));
    setEdit(true);
  };

  // Kotak kosong = nomor belum dicatat (disimpan sebagai kosong).
  const angka = (id: string) => (nilai[id] ? Number(nilai[id]) : null);
  const terisi = riwayat.map((item) => angka(item.id)).filter((n): n is number => n !== null);
  const valid = terisi.every((n) => Number.isInteger(n) && n >= 1) && new Set(terisi).size === terisi.length;

  const simpan = () => start(async () => {
    const response = await fetch('/api/targets/formulir', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerId, items: riwayat.map((item) => ({ id: item.id, noFormulir: angka(item.id) })) }),
    }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      toast.error(body?.error ?? 'Gagal menyimpan nomor formulir.');
      return;
    }
    toast.success('Nomor formulir diperbarui.');
    setEdit(false);
    onSaved();
  });

  return (
    <div className="py-2 text-[13px] leading-snug">
      <div className="grid grid-cols-[1rem_5.25rem_minmax(0,1fr)] items-start gap-2.5">
        <FileText className="mt-px size-3.5 text-muted-foreground" aria-hidden />
        <span className="text-xs text-muted-foreground">No. Formulir</span>
        <span className="flex items-center justify-between gap-2">
          {terakhir != null ? (
            <span className="font-semibold tabular-nums">Form {terakhir}</span>
          ) : (
            <span className={riwayat.length ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}>
              {riwayat.length ? 'Belum diisi' : '—'}
            </span>
          )}
          {canEdit && riwayat.length > 0 && !edit && (
            <button
              type="button"
              onClick={buka}
              aria-label="Ubah nomor formulir"
              title="Ubah nomor formulir"
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Pencil className="size-3.5" />
            </button>
          )}
        </span>
      </div>

      {edit && (
        <form
          className="mt-2.5 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5"
          onSubmit={(event) => { event.preventDefault(); if (valid) simpan(); }}
        >
          <p className="text-[11px] text-muted-foreground">Samakan dengan nomor di formulir fisik. Kosongkan bila belum ada.</p>
          {riwayat.map((item) => (
            <label key={item.id} className="flex items-center gap-2">
              <span
                className={cn(
                  'w-24 shrink-0 rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold',
                  item.jenis === 'verifikasi' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-primary/10 text-primary',
                )}
              >
                {item.jenis === 'verifikasi' ? 'Verifikasi' : 'Penyesuaian'}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{tanggalJakarta(item.createdAt)}</span>
              <span className="text-xs text-muted-foreground">Form</span>
              <input
                inputMode="numeric"
                value={nilai[item.id] ?? ''}
                onChange={(event) => setNilai((lama) => ({ ...lama, [item.id]: event.target.value.replace(/\D/g, '').slice(0, 7) }))}
                aria-label={`No. Formulir ${item.jenis}`}
                className="h-8 w-20 rounded-md border border-border bg-card px-2 text-right text-sm font-semibold tabular-nums focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              />
            </label>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setEdit(false)} disabled={pending}>Batal</Button>
            <Button type="submit" size="sm" className="h-8" disabled={!valid || pending}>{pending ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      )}
    </div>
  );
}
