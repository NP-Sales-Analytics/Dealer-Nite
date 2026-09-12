'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DepotFields } from './depot-fields';
import type { OrderRow } from '@/app/api/order/list/route';
import { QtyStepper } from '@/components/reservation/qty-stepper';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PilihanDepot } from '@/lib/dashboard/hierarchy';
import { MAKS_TOTAL, pesanGagal } from '@/lib/order/aturan';

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
  depotOptions,
  onOpenChange,
  onSaved,
}: {
  row: OrderRow | null;
  depotOptions: PilihanDepot[];
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

  // MAKS_TOTAL ikut diperiksa DI SINI, bukan hanya di server: sebelumnya
  // batas ini tidak muncul di layar mana pun, jadi angka di atasnya ditolak
  // sebagai kegagalan tanpa sebab yang bisa dibaca.
  const kebanyakan = dus !== '' && Number(dus) > MAKS_TOTAL;
  const dusValid =
    dus !== '' && Number.isInteger(Number(dus)) && Number(dus) >= 0 && !kebanyakan;
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
        toast.error(pesanGagal(res.status, await res.json().catch(() => null)));
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
          <DialogTitle className="text-base font-semibold">Ubah Data Order</DialogTitle>
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

          <DepotFields
            idPrefix="o"
            depot={depot}
            options={depotOptions}
            onDepotChange={setDepot}
          />

          <div className="space-y-2.5">
            <Label htmlFor="o-dus" className="text-base">Jumlah dus</Label>
            {/* max eksplisit: bawaan stepper 1.000 membuat tombol + mati diam-diam
                di 1.000 padahal koreksi admin boleh sampai MAKS_TOTAL. */}
            <QtyStepper
              id="o-dus"
              value={dus}
              onChange={setDus}
              max={MAKS_TOTAL}
              ariaLabel="Jumlah dus"
              onBatas={() => toast.info(`Maksimal ${MAKS_TOTAL.toLocaleString('id-ID')} dus.`)}
            />
            {kebanyakan && (
              <p className="text-xs leading-relaxed font-medium text-destructive">
                Maksimal {MAKS_TOTAL.toLocaleString('id-ID')} dus. Turunkan angkanya dulu.
              </p>
            )}
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
