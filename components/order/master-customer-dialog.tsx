'use client';

import { X } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { tambahMasterCustomer } from '@/app/(app)/order/detail/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Menambah toko baru ke master data, mis. peserta yang datang mendadak. */
export function MasterCustomerDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[85svh] w-full max-w-lg grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <DialogTitle className="text-base font-semibold">Tambah Master Data</DialogTitle>
            <p className="truncate text-xs text-muted-foreground">
              Kode SAP dipakai customer untuk login, jadi harus unik.
            </p>
          </div>
          <DialogClose
            aria-label="Tutup"
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-4" />
          </DialogClose>
        </header>

        <form
          id="master-form"
          action={(fd) =>
            start(async () => {
              const msg = await tambahMasterCustomer(null, fd);
              if (msg) {
                toast.error(msg);
                return;
              }
              toast.success('Master customer ditambahkan.');
              onOpenChange(false);
              onSaved();
            })
          }
          className="min-h-0 space-y-4 overflow-y-auto px-5 py-5"
        >
          <div className="space-y-2">
            <Label htmlFor="m-nama">Nama Customer</Label>
            <Input className="h-11" id="m-nama" name="namaToko" required minLength={2} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-sap">Kode SAP</Label>
            <Input
              className="h-11"
              id="m-sap"
              name="kodeSap"
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="Contoh: 600001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-pemilik">Nama Pemilik (opsional)</Label>
            <Input className="h-11" id="m-pemilik" name="namaPemilik" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="m-depot">Depot</Label>
              <Input className="h-11" id="m-depot" name="depot" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-region">Region</Label>
              <Input className="h-11" id="m-region" name="region" placeholder="Misal: 3A" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="m-wilayah">Wilayah</Label>
              <Input
                className="h-11"
                id="m-wilayah"
                name="wilayah"
                placeholder="Misal: Indonesia Barat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="m-qty">Qty Undangan</Label>
              <Input
                className="h-11"
                id="m-qty"
                name="qtyUndangan"
                inputMode="numeric"
                defaultValue="1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-pic">PIC RSM / ASM (opsional)</Label>
            <Input className="h-11" id="m-pic" name="picRsmAsm" />
          </div>
        </form>

        <footer className="flex items-center gap-2 border-t border-border px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1 sm:flex-none sm:px-6"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Batal
          </Button>
          <Button type="submit" form="master-form" className="h-11 flex-1" disabled={pending}>
            {pending ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
