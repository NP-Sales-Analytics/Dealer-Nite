'use client';

import { CheckCircle2, FileSpreadsheet, FileUp, X } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { DealerNightSelect } from './dealer-night-select';
import type { DealerNightOption } from './types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Hasil = { baru: number; diperbarui: number; dilewati: number };

export function UploadMasterDialog({
  dealerNights, initialDealerNightId, onOpenChange, onSaved,
}: {
  dealerNights: DealerNightOption[];
  initialDealerNightId: string;
  onOpenChange: (value: boolean) => void;
  onSaved: () => void;
}) {
  const [dealerNightId, setDealerNightId] = useState(initialDealerNightId);
  const [file, setFile] = useState<File | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const dn = dealerNights.find((item) => item.id === dealerNightId);

  const unggah = () => start(async () => {
    if (!file) return;
    setGalat(null);
    const data = new FormData();
    data.set('dealerNightId', dealerNightId);
    data.set('file', file);
    const response = await fetch('/api/master/import', { method: 'POST', body: data }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      setGalat(body?.error ?? 'Upload gagal. Coba lagi.');
      return;
    }
    setHasil(body as Hasil);
    toast.success(`Master ${dn?.name ?? 'DN'} berhasil diunggah.`);
    onSaved();
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[88svh] w-full max-w-lg sm:max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden>
              <FileSpreadsheet className="size-4.5" />
            </span>
            <div>
              <DialogTitle className="text-base font-semibold">Upload Master Toko</DialogTitle>
              <p className="text-xs text-muted-foreground">CSV atau Excel dengan template Master Toko</p>
            </div>
          </div>
          <DialogClose aria-label="Tutup" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="size-4" />
          </DialogClose>
        </header>

        <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-5">
          {hasil ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-600" aria-hidden />
              <p className="font-semibold">Upload ke {dn?.name} selesai</p>
              <div className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-xl border border-border">
                {([['Toko baru', hasil.baru], ['Diperbarui', hasil.diperbarui], ['Dilewati', hasil.dilewati]] as const).map(([label, n]) => (
                  <div key={label} className="px-2 py-3">
                    <p className="text-2xl font-bold tabular-nums">{n}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              {hasil.dilewati > 0 && (
                <p className="text-xs text-muted-foreground">
                  Toko yang dilewati sudah diverifikasi admin DN, jadi datanya tidak ditimpa (hanya Pax yang diperbarui).
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Upload untuk Dealer Night</Label>
                <DealerNightSelect options={dealerNights} value={dealerNightId} onChange={setDealerNightId} />
                {dn?.depots && dn.depots.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Depot yang diterima: {dn.depots.map((item) => item.depot).join(', ')}
                  </p>
                )}
              </div>

              <input
                ref={input}
                type="file"
                accept=".csv,.xlsx"
                className="sr-only"
                onChange={(event) => { setFile(event.target.files?.[0] ?? null); setGalat(null); }}
              />
              <button
                type="button"
                onClick={() => input.current?.click()}
                className={cn(
                  'flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  file ? 'border-primary/50 bg-primary/5' : 'border-border',
                )}
              >
                <FileUp className="size-7 text-primary" aria-hidden />
                <span className="text-sm font-semibold">{file ? file.name : 'Pilih file .csv atau .xlsx'}</span>
                <span className="text-xs text-muted-foreground">
                  {file ? `${(file.size / 1024).toFixed(0)} KB · klik untuk ganti` : 'Maksimal 5 MB'}
                </span>
              </button>

              {galat && (
                <p className="rounded-xl border border-destructive/40 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">{galat}</p>
              )}

              <div className="rounded-xl border border-border bg-secondary/30 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                Kolom wajib: MG Code, MG Name, SOTP Code, SOTP Name, Depot Code, Salesman, SPV,
                Target DN Pembulatan Inc. PPN. Kolom Pax (paling kanan) berisi jumlah orang
                yang didaftarkan tiap toko; boleh dikosongkan.{' '}
                <a href="/api/master/template" download className="font-semibold text-primary underline-offset-2 hover:underline">
                  Unduh template Excel
                </a>
                <br />
                MG Code yang sudah ada akan diperbarui. Satu baris salah membatalkan seluruh upload.
              </div>
            </>
          )}
        </div>

        <footer className="flex gap-2 border-t border-border px-5 py-4">
          {hasil ? (
            <Button className="h-11 flex-1" onClick={() => onOpenChange(false)}>Selesai</Button>
          ) : (
            <>
              <Button variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={pending}>Batal</Button>
              <Button className="h-11 flex-1" onClick={unggah} disabled={!file || !dealerNightId || pending}>
                {pending ? 'Mengunggah...' : 'Upload Master'}
              </Button>
            </>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
