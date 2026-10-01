'use client';

import { Store, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { DealerNightSelect } from './dealer-night-select';
import type { DealerNightOption, TargetRow } from './types';
import { Button } from '@/components/ui/button';
import { PilihSatu } from '@/components/ui/combobox';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseRupiahInput } from '@/lib/target/form';
import { MIN_TARGET_DN } from '@/lib/target/rules';

function Isian({ id, label, value, onChange, placeholder, disabled }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className="h-11" />
    </div>
  );
}

/** Tambah satu toko (row kosong) atau ubah toko yang ada. */
export function MasterTokoDialog({
  row, dealerNights, initialDealerNightId, onOpenChange, onSaved,
}: {
  row: TargetRow | null;
  dealerNights: DealerNightOption[];
  initialDealerNightId: string;
  onOpenChange: (value: boolean) => void;
  onSaved: () => void;
}) {
  const edit = !!row;
  const [dealerNightId, setDealerNightId] = useState(row?.dealerNightId ?? initialDealerNightId);
  const [form, setForm] = useState({
    mgCode: row?.mgCode ?? '',
    mgName: row?.mgName ?? '',
    sotpCode: row?.sotpCode ?? '',
    sotpName: row?.sotpName ?? '',
    depotCode: row?.depotCode ?? '',
    salesman: row?.salesman ?? '',
    spv: row?.spv ?? '',
    target: row ? String(row.targetAwal) : '',
  });
  const [pending, start] = useTransition();
  const set = (key: keyof typeof form) => (value: string) => setForm((lama) => ({ ...lama, [key]: value }));

  const depots = dealerNights.find((item) => item.id === dealerNightId)?.depots ?? [];
  const namaDepot = (kode: string) => depots.find((item) => item.kode === kode)?.depot ?? kode;
  const target = parseRupiahInput(form.target);
  const targetTerkunci = edit && !!row?.verifiedAt;
  const valid = !!dealerNightId && !!form.mgCode.trim() && !!form.mgName.trim() && !!form.sotpCode.trim()
    && !!form.sotpName.trim() && !!form.depotCode && Number.isFinite(target) && target >= MIN_TARGET_DN;

  const simpan = () => start(async () => {
    const response = await fetch(edit ? `/api/master/${row!.customerId}` : '/api/master', {
      method: edit ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dealerNightId,
        mgCode: form.mgCode, mgName: form.mgName, sotpCode: form.sotpCode, sotpName: form.sotpName,
        depotCode: form.depotCode, salesman: form.salesman, spv: form.spv, targetDnAwal: target,
      }),
    }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      toast.error(body?.error ?? 'Gagal menyimpan master toko.');
      return;
    }
    toast.success(edit ? 'Data toko diperbarui.' : `${form.mgName.toUpperCase()} ditambahkan.`);
    onSaved();
    onOpenChange(false);
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[90svh] w-full max-w-2xl sm:max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary" aria-hidden>
              <Store className="size-4.5" />
            </span>
            <div>
              <DialogTitle className="text-base font-semibold">{edit ? 'Edit Master Toko' : 'Tambah Master Toko'}</DialogTitle>
              <p className="text-xs text-muted-foreground">Data toko untuk Target DN dan kehadiran</p>
            </div>
          </div>
          <DialogClose aria-label="Tutup" className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="size-4" />
          </DialogClose>
        </header>

        <form
          id="master-form"
          onSubmit={(event) => { event.preventDefault(); if (valid) simpan(); }}
          className="min-h-0 space-y-4 overflow-y-auto px-5 py-5"
        >
          <div className="space-y-2">
            <Label>Dealer Night</Label>
            {edit ? (
              <DealerNightSelect options={dealerNights.filter((item) => item.id === dealerNightId)} value={dealerNightId} onChange={() => {}} />
            ) : (
              <DealerNightSelect
                options={dealerNights}
                value={dealerNightId}
                onChange={(id) => { setDealerNightId(id); set('depotCode')(''); }}
              />
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Isian id="mg-code" label="MG Code" value={form.mgCode} onChange={set('mgCode')} placeholder="632723" />
            <Isian id="mg-name" label="MG Name" value={form.mgName} onChange={set('mgName')} placeholder="Nama toko" />
            <Isian id="sotp-code" label="SOTP Code" value={form.sotpCode} onChange={set('sotpCode')} />
            <Isian id="sotp-name" label="SOTP Name" value={form.sotpName} onChange={set('sotpName')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-depot">Depot</Label>
            <PilihSatu
              id="m-depot"
              items={depots.map((item) => item.kode)}
              value={form.depotCode}
              onChange={set('depotCode')}
              format={namaDepot}
              placeholder={depots.length ? 'Pilih depot' : 'DN ini belum punya depot'}
              cariPlaceholder="Cari depot..."
              kosong="Depot tidak ditemukan."
            />
            <p className="text-xs text-muted-foreground">Hanya depot yang termasuk Dealer Night ini.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Isian id="salesman" label="Salesman (opsional)" value={form.salesman} onChange={set('salesman')} />
            <Isian id="spv" label="SPV (opsional)" value={form.spv} onChange={set('spv')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="m-target">Target DN dari pusat</Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">Rp</span>
              <Input
                id="m-target"
                inputMode="numeric"
                disabled={targetTerkunci}
                value={Number.isFinite(target) ? target.toLocaleString('id-ID') : form.target}
                onChange={(event) => set('target')(event.target.value.replace(/[^0-9]/g, ''))}
                className="h-11 pl-10 font-semibold tabular-nums"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {targetTerkunci
                ? 'Target sudah diverifikasi admin DN. Ubah lewat Sesuaikan Target.'
                : 'Minimal Rp50.000.000. Admin DN akan memverifikasi target ini.'}
            </p>
          </div>
        </form>

        <footer className="flex gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={pending}>Batal</Button>
          <Button type="submit" form="master-form" className="h-11 flex-1" disabled={!valid || pending}>
            {pending ? 'Menyimpan...' : edit ? 'Simpan Perubahan' : 'Tambah Toko'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
