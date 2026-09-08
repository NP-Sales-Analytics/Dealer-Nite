'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { OrderRow } from '@/app/api/order/list/route';
import { QtyStepper } from '@/components/reservation/qty-stepper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Koreksi admin untuk satu toko: nama, depot, dan jumlah dus.
 *
 * Angka dus di sini bersifat absolut (total, bukan tambahan) dan TIDAK tunduk
 * pada lantai pengambilan pertama maupun tenggat - halaman inilah jalan keluar
 * kalau ada salah catat. Selisihnya yang ditulis ke ledger, jadi riwayat
 * penyesuaian tetap utuh.
 */
export function EditOrderDialog({
  row,
  depots,
  onOpenChange,
  onSaved,
}: {
  row: OrderRow | null;
  depots: string[];
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [nama, setNama] = useState('');
  const [depot, setDepot] = useState('');
  const [dus, setDus] = useState('0');
  const [sibuk, setSibuk] = useState(false);

  // Diisi ulang tiap kali baris berganti, jadi dialog ini tidak perlu di-remount.
  useEffect(() => {
    if (!row) return;
    setNama(row.namaToko);
    setDepot(row.depot ?? '');
    setDus(String(row.total));
  }, [row]);

  if (!row) return null;

  const dusValid = dus !== '' && Number.isInteger(Number(dus)) && Number(dus) >= 0;
  const valid = dusValid && nama.trim().length >= 2 && depot.trim().length >= 1;
  const selisih = dusValid ? Number(dus) - row.total : 0;

  async function simpan() {
    if (!row) return;
    setSibuk(true);
    try {
      const res = await fetch(`/api/order/customer/${row.customerId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          namaToko: nama.trim(),
          depot: depot.trim(),
          total: Number(dus),
        }),
      });
      if (!res.ok) {
        toast.error('Gagal menyimpan perubahan.');
        return;
      }
      toast.success(`${nama.trim().toUpperCase()}: ${dus} dus tercatat.`);
      onOpenChange(false);
      onSaved();
    } catch {
      toast.error('Koneksi bermasalah. Coba lagi.');
    } finally {
      setSibuk(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      {/* grid-rows supaya tombol simpan tidak terdorong keluar layar oleh
          keyboard di HP. */}
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[88svh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold">Ubah Data Order</DialogTitle>
            <p className="truncate text-xs text-muted-foreground">{row.kodeSap}</p>
          </div>
          <DialogClose
            aria-label="Tutup"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </header>

        <div className="min-h-0 space-y-5 overflow-y-auto px-5 py-5">
          <div className="space-y-2">
            <Label htmlFor="o-nama">Nama Customer</Label>
            <Input
              className="h-11"
              id="o-nama"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="o-depot">Depot</Label>
            {/* datalist bawaan browser, bukan combobox: daftarnya panjang tapi
                pemakainya mengetik, dan ini sudah dapat keyboard + screen reader. */}
            <Input
              className="h-11"
              id="o-depot"
              list="o-depot-list"
              value={depot}
              onChange={(e) => setDepot(e.target.value)}
            />
            <datalist id="o-depot-list">
              {depots.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="o-dus" className="text-base">Jumlah dus</Label>
            <QtyStepper id="o-dus" value={dus} onChange={setDus} ariaLabel="Jumlah dus" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {selisih === 0
                ? `Tercatat sekarang ${row.total} dus. Isi dengan total keseluruhan, bukan tambahan.`
                : `Perubahan: ${selisih > 0 ? '+' : ''}${selisih} dus dari ${row.total}.`}
            </p>
            {row.dusAwal !== null && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Pengambilan pertama saat ini <span className="font-semibold text-foreground">{row.dusAwal} dus</span>.
                Menyimpan angka lebih kecil akan menurunkan patokan itu.
              </p>
            )}
          </div>
        </div>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-4">
          <Button
            variant="outline"
            className="h-11 flex-1 sm:flex-none sm:px-6"
            onClick={() => onOpenChange(false)}
            disabled={sibuk}
          >
            Batal
          </Button>
          <Button className="h-11 flex-1" onClick={simpan} disabled={!valid || sibuk}>
            {sibuk ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
