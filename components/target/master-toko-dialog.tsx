'use client';

import { Plus, RotateCcw, Store, Trash2, X } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { DealerNightSelect } from './dealer-night-select';
import type { DealerNightOption, TargetRow } from './types';
import { Button } from '@/components/ui/button';
import { PilihSatu } from '@/components/ui/combobox';
import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { parseRupiahInput } from '@/lib/target/form';
import { MIN_TARGET_DN, teksMinimal } from '@/lib/target/rules';

const MAKS_SOTP = 30;

/** Satu bagian form: judul kapital + keterangan, isian memakai placeholder. */
function Bagian({ judul, keterangan, aksi, children }: {
  judul: string; keterangan?: string; aksi?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[0.8125rem] font-bold uppercase tracking-wide">{judul}</h3>
          {keterangan && <p className="mt-0.5 text-xs text-muted-foreground">{keterangan}</p>}
        </div>
        {aksi}
      </div>
      {children}
    </section>
  );
}

type BarisSotp = { id: number; kode: string; nama: string };

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
    depotCode: row?.depotCode ?? '',
    salesman: row?.salesman ?? '',
    spv: row?.spv ?? '',
    target: row ? String(row.targetAwal) : '',
    pax: row?.paxTerdaftar == null ? '' : String(row.paxTerdaftar),
    noUndian: row?.undianMaster ?? '',
  });
  // id lokal hanya untuk key React, supaya isian tidak bergeser saat baris dihapus.
  const idBerikut = useRef(0);
  const barisBaru = (kode = '', nama = ''): BarisSotp => ({ id: idBerikut.current++, kode, nama });
  const [sotp, setSotp] = useState<BarisSotp[]>(() => (row?.sotp.length ? row.sotp.map((item) => barisBaru(item.kode, item.nama)) : [barisBaru()]));
  const [pending, start] = useTransition();
  const set = (key: keyof typeof form) => (value: string) => setForm((lama) => ({ ...lama, [key]: value }));
  const ubahSotp = (id: number, kolom: 'kode' | 'nama', value: string) =>
    setSotp((lama) => lama.map((item) => (item.id === id ? { ...item, [kolom]: value } : item)));

  const dn = dealerNights.find((item) => item.id === dealerNightId);
  const depots = dn?.depots ?? [];
  const minTarget = dn?.minTargetDn ?? MIN_TARGET_DN;
  const namaDepot = (kode: string) => depots.find((item) => item.kode === kode)?.depot ?? kode;
  const target = parseRupiahInput(form.target);
  const pax = form.pax === '' ? null : Number(form.pax);
  const paxValid = pax === null || (Number.isInteger(pax) && pax >= 1 && pax <= 1000);
  const targetTerkunci = edit && !!row?.verifiedAt;
  const [yakinReset, setYakinReset] = useState(false);

  const kodeSotp = sotp.map((item) => item.kode.trim()).filter(Boolean);
  const kodeDobel = kodeSotp.find((kode, index) => kodeSotp.indexOf(kode) !== index);
  const sotpValid = sotp.every((item) => item.kode.trim() && item.nama.trim()) && !kodeDobel;

  const resetVerifikasi = () => start(async () => {
    const response = await fetch('/api/targets/reset', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ customerId: row!.customerId }),
    }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      toast.error(body?.error ?? 'Gagal mereset verifikasi.');
      return;
    }
    toast.success(`Verifikasi ${row!.mgName} direset ke target pusat.`);
    onSaved();
    onOpenChange(false);
  });
  const valid = !!dealerNightId && !!form.mgCode.trim() && !!form.mgName.trim() && sotpValid
    && !!form.depotCode && Number.isFinite(target) && target >= minTarget && paxValid;

  const simpan = () => start(async () => {
    const response = await fetch(edit ? `/api/master/${row!.customerId}` : '/api/master', {
      method: edit ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        dealerNightId,
        mgCode: form.mgCode, mgName: form.mgName,
        sotp: sotp.map((item) => ({ kode: item.kode, nama: item.nama })),
        depotCode: form.depotCode, salesman: form.salesman, spv: form.spv, targetDnAwal: target, qtyUndangan: pax,
        noUndian: form.noUndian,
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
          className="min-h-0 space-y-6 overflow-y-auto px-5 py-5"
        >
          <Bagian judul="Dealer Night" keterangan="Acara tempat toko ini didaftarkan.">
            {edit ? (
              <DealerNightSelect options={dealerNights.filter((item) => item.id === dealerNightId)} value={dealerNightId} onChange={() => {}} />
            ) : (
              <DealerNightSelect
                options={dealerNights}
                value={dealerNightId}
                onChange={(id) => { setDealerNightId(id); set('depotCode')(''); }}
              />
            )}
          </Bagian>

          <Bagian judul="Depot" keterangan="Depot pengiriman untuk Master Group ini.">
            <PilihSatu
              id="m-depot"
              items={depots.map((item) => item.kode)}
              value={form.depotCode}
              onChange={set('depotCode')}
              format={namaDepot}
              placeholder={depots.length ? 'Pilih Depot' : 'DN ini belum punya depot'}
              cariPlaceholder="Cari depot..."
              kosong="Depot tidak ditemukan."
            />
          </Bagian>

          <Bagian judul="Master Group" keterangan="Kode dan nama Master Group yang menaungi Sold To Party di bawah ini.">
            <div className="grid grid-cols-[3fr_7fr] gap-3">
              <Input aria-label="Kode MG" placeholder="Kode MG" value={form.mgCode} onChange={(e) => set('mgCode')(e.target.value)} className="h-11" />
              <Input aria-label="Nama Master Group" placeholder="Nama Master Group" value={form.mgName} onChange={(e) => set('mgName')(e.target.value)} className="h-11" />
            </div>
          </Bagian>

          <Bagian
            judul="Sold To Party"
            keterangan={`Cabang yang tergabung dalam Master Group ini. Minimal 1, maksimal ${MAKS_SOTP}.`}
            aksi={<span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{sotp.length} / {MAKS_SOTP}</span>}
          >
            <div className="space-y-2.5">
              {sotp.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[3fr_7fr_auto] items-center gap-3">
                  <Input
                    aria-label={`Kode SOTP ${index + 1}`}
                    placeholder="Kode SOTP"
                    value={item.kode}
                    onChange={(e) => ubahSotp(item.id, 'kode', e.target.value)}
                    aria-invalid={!!kodeDobel && item.kode.trim() === kodeDobel}
                    className="h-11"
                  />
                  <Input
                    aria-label={`Nama Sold To Party ${index + 1}`}
                    placeholder="Nama Sold To Party"
                    value={item.nama}
                    onChange={(e) => ubahSotp(item.id, 'nama', e.target.value)}
                    className="h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setSotp((lama) => lama.filter((baris) => baris.id !== item.id))}
                    disabled={sotp.length === 1}
                    aria-label={`Hapus Sold To Party ${index + 1}`}
                    title={sotp.length === 1 ? 'Minimal 1 Sold To Party' : 'Hapus'}
                    className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {kodeDobel && <p className="text-xs text-destructive">Kode SOTP {kodeDobel} dobel.</p>}
              {sotp.length < MAKS_SOTP && (
                <button
                  type="button"
                  onClick={() => setSotp((lama) => [...lama, barisBaru()])}
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-primary/40 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <Plus className="size-4" />
                  Tambah Sold To Party
                </button>
              )}
            </div>
          </Bagian>

          <Bagian judul="Salesman & SPV" keterangan="Opsional.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input aria-label="Salesman" placeholder="Salesman" value={form.salesman} onChange={(e) => set('salesman')(e.target.value)} className="h-11" />
              <Input aria-label="SPV" placeholder="SPV" value={form.spv} onChange={(e) => set('spv')(e.target.value)} className="h-11" />
            </div>
          </Bagian>

          <Bagian judul="Pax & No Undian" keterangan="Opsional.">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Input
                  aria-label="Pax terdaftar"
                  inputMode="numeric"
                  value={form.pax}
                  onChange={(event) => set('pax')(event.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Pax terdaftar"
                  aria-invalid={!paxValid}
                  className="h-11 tabular-nums"
                />
                {!paxValid && <p className="text-xs text-destructive">Pax harus 1 sampai 1.000 orang.</p>}
              </div>
              <Input
                aria-label="No Undian"
                inputMode="numeric"
                value={form.noUndian}
                onChange={(event) => set('noUndian')(event.target.value.replace(/\D/g, '').slice(0, 20))}
                placeholder="No Undian"
                className="h-11 tabular-nums"
              />
            </div>
          </Bagian>

          <Bagian
            judul="Target DN"
            keterangan={targetTerkunci
              ? 'Target sudah diverifikasi admin DN. Ubah lewat penyesuaian, atau Reset Verifikasi di bawah.'
              : `Target dari pusat. ${teksMinimal(minTarget)}`}
          >
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted-foreground">Rp</span>
              <Input
                aria-label="Target DN dari pusat"
                inputMode="numeric"
                disabled={targetTerkunci}
                value={Number.isFinite(target) ? target.toLocaleString('id-ID') : form.target}
                onChange={(event) => set('target')(event.target.value.replace(/[^0-9]/g, ''))}
                className="h-11 pl-10 font-semibold tabular-nums"
              />
            </div>
          </Bagian>
        </form>

        <footer className="flex gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)} disabled={pending}>Batal</Button>
          {targetTerkunci && (
            <Button
              type="button"
              variant="outline"
              title="Kembalikan ke target pusat: verifikasi, penyesuaian, dan catatan kupon toko ini dihapus."
              onBlur={() => setYakinReset(false)}
              onClick={() => (yakinReset ? resetVerifikasi() : setYakinReset(true))}
              disabled={pending}
              className={yakinReset
                ? 'h-11 gap-1.5 border-destructive bg-destructive text-white hover:bg-destructive/90 hover:text-white'
                : 'h-11 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive'}
            >
              <RotateCcw className="size-4" />
              {yakinReset ? 'Yakin reset?' : 'Reset Verifikasi'}
            </Button>
          )}
          <Button type="submit" form="master-form" className="h-11 flex-1" disabled={!valid || pending}>
            {pending ? 'Menyimpan...' : edit ? 'Simpan Perubahan' : 'Tambah Toko'}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
