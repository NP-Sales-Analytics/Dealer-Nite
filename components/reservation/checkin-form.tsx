'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { CustomerDetailCard } from './customer-detail-card';
import { ManualEntryForm } from './manual-entry-form';
import { QtyStepper } from './qty-stepper';
import { SearchBar, type CustomerSearchResult } from './search-bar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type Konfirmasi = {
  judul: string;
  isi: string;
  labelAksi: string;
  lanjut: () => void;
};

export function CheckinForm({ depots }: { depots: string[] }) {
  const [selected, setSelected] = useState<CustomerSearchResult | null>(null);
  const [qty, setQty] = useState('1');
  const [manualOpen, setManualOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [konfirmasi, setKonfirmasi] = useState<Konfirmasi | null>(null);
  const queryClient = useQueryClient();

  const reset = () => { setSelected(null); setQty('1'); };

  async function submit(confirmOverwrite = false, confirmOverQuota = false) {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          isManualEntry: false,
          customerId: selected.id,
          qtyHadir: Number(qty),
          confirmOverwrite,
          confirmOverQuota,
        }),
      });
      const body = await res.json();

      // Dua peringatan server dijawab lewat AlertDialog, bukan confirm() native:
      // popup sistem di HP gampang ter-dismiss tak sengaja padahal isinya
      // keputusan menimpa data kehadiran.
      if (res.status === 409 && body.code === 'ALREADY_CHECKED_IN') {
        setKonfirmasi({
          judul: 'Toko ini sudah dicatat hadir',
          isi: `"${body.namaToko}" sudah tercatat hadir ${body.existing.qtyHadir} orang. Ganti menjadi ${qty} orang?`,
          labelAksi: 'Ya, ganti',
          lanjut: () => submit(true, confirmOverQuota),
        });
        return;
      }
      if (res.status === 409 && body.code === 'OVER_QUOTA') {
        setKonfirmasi({
          judul: 'Melebihi jumlah undangan',
          isi: `Jumlah hadir (${body.qtyHadir}) melebihi undangan (${body.qtyUndangan}). Tetap simpan?`,
          labelAksi: 'Tetap simpan',
          lanjut: () => submit(confirmOverwrite, true),
        });
        return;
      }
      if (!res.ok) {
        toast.error('Gagal menyimpan. Coba lagi.');
        return;
      }

      toast.success(`${selected.namaToko}: ${qty} orang tercatat hadir.`);
      // Buang cache pencarian supaya badge "Sudah dicatat" langsung akurat.
      queryClient.invalidateQueries({ queryKey: ['customer-search'] });
      reset();
    } catch {
      toast.error('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  }

  const qtyValid = qty !== '' && Number.isInteger(Number(qty)) && Number(qty) >= 0;

  return (
    <div className="space-y-4">
      {!selected ? (
        <>
          <SearchBar onSelect={(c) => { setSelected(c); setQty(String(c.qtyUndangan || 1)); }} />
          <Button
            variant="link"
            className="h-11 px-0 text-base"
            onClick={() => setManualOpen(true)}
          >
            Tidak ditemukan? Tambah manual
          </Button>
          <ManualEntryForm open={manualOpen} depots={depots} onOpenChange={setManualOpen} />
        </>
      ) : (
        <>
          <CustomerDetailCard customer={selected} />

          <div className="space-y-2.5 rounded-2xl border border-border bg-card p-4 shadow-xs">
            <Label htmlFor="qty" className="text-base">Jumlah orang yang hadir</Label>
            <QtyStepper value={qty} onChange={setQty} />
            <p className="text-xs text-muted-foreground">
              Terisi otomatis sesuai undangan. Ubah kalau jumlah yang datang berbeda.
            </p>
          </div>

          {/* Aksi menempel di bawah layar supaya selalu terjangkau jempol,
              dan tetap aman dari home indicator iOS. */}
          <div className="sticky bottom-0 -mx-4 flex gap-3 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            <Button
              variant="outline"
              className="h-12 flex-1 text-base md:flex-none md:px-6"
              onClick={reset}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              className="h-12 flex-[2] text-base md:flex-none md:px-8"
              onClick={() => submit()}
              disabled={!qtyValid || submitting}
            >
              {submitting ? 'Menyimpan...' : 'Simpan Kehadiran'}
            </Button>
          </div>
        </>
      )}

      <AlertDialog open={konfirmasi !== null} onOpenChange={(o) => !o && setKonfirmasi(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{konfirmasi?.judul}</AlertDialogTitle>
            <AlertDialogDescription>{konfirmasi?.isi}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              onClick={() => {
                const next = konfirmasi?.lanjut;
                setKonfirmasi(null);
                next?.();
              }}
            >
              {konfirmasi?.labelAksi}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
