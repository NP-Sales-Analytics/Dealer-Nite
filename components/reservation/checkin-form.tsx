'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { CustomerDetailCard } from './customer-detail-card';
import { ManualEntryForm } from './manual-entry-form';
import { SearchBar, type CustomerSearchResult } from './search-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CheckinForm({ depots }: { depots: string[] }) {
  const [selected, setSelected] = useState<CustomerSearchResult | null>(null);
  const [qty, setQty] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const reset = () => { setSelected(null); setQty(''); };

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

      if (res.status === 409 && body.code === 'ALREADY_CHECKED_IN') {
        const prev = body.existing.qtyHadir;
        if (confirm(`"${body.namaToko}" sudah dicatat hadir ${prev} orang. Ganti menjadi ${qty} orang?`)) {
          await submit(true, confirmOverQuota);
        }
        return;
      }
      if (res.status === 409 && body.code === 'OVER_QUOTA') {
        if (confirm(`Jumlah hadir (${body.qtyHadir}) melebihi undangan (${body.qtyUndangan}). Tetap simpan?`)) {
          await submit(confirmOverwrite, true);
        }
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
      {!selected && <SearchBar onSelect={setSelected} />}

      {selected && (
        <>
          <CustomerDetailCard customer={selected} />
          <div className="space-y-2">
            <Label htmlFor="qty">Jumlah orang yang hadir</Label>
            <Input
              id="qty" type="number" min={0} inputMode="numeric" value={qty}
              onChange={(e) => setQty(e.target.value)} autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={() => submit()} disabled={!qtyValid || submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Kehadiran'}
            </Button>
            <Button variant="outline" onClick={reset} disabled={submitting}>Batal</Button>
          </div>
        </>
      )}

      {!selected && (
        <>
          <Button variant="link" className="px-0" onClick={() => setManualOpen(true)}>
            Tidak ditemukan? Tambah manual
          </Button>
          <ManualEntryForm open={manualOpen} depots={depots} onOpenChange={setManualOpen} />
        </>
      )}
    </div>
  );
}
