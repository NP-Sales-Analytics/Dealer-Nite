'use client';

import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DetailOrderDialog } from './detail-order-dialog';
import { EditOrderDialog } from './edit-order-dialog';
import { HapusCustomerDialog } from './hapus-customer-dialog';
import { MasterCustomerDialog } from './master-customer-dialog';
import { ResetOrderDialog } from './reset-order-dialog';
import type { OrderRow } from '@/app/api/order/list/route';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, jamJakarta } from '@/lib/utils';

/** Jumlah dus dibuat menonjol: inilah angka yang dicari orang di halaman ini. */
function PillDus({ total }: { total: number }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-sm font-bold tabular-nums',
        total > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground',
      )}
    >
      {total} dus
    </span>
  );
}

/**
 * Waktu pengambilan terakhir. Warnanya sengaja berbeda dari chip dus (biru)
 * supaya dua kolom angka itu bisa dipindai sekilas tanpa membaca judulnya.
 * Depot dibiarkan teks polos, sepola Detail Toko Hadir.
 */
function PillWaktu({ waktu, kali }: { waktu: string | null; kali: number }) {
  if (!waktu) {
    return <span className="text-xs text-muted-foreground">Belum ada</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-emerald-800">
      {jamJakarta(waktu)}
      <span className="text-[11px] font-medium text-emerald-700/70">{kali}x</span>
    </span>
  );
}

export function DetailOrderTable({
  rows,
  page,
  totalPages,
  total,
  pageSize,
  depots,
  adaFilter,
  bisaUbah,
  urut,
  onPageChange,
  onUrutChange,
  onChanged,
}: {
  rows: OrderRow[];
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  depots: string[];
  adaFilter: boolean;
  bisaUbah: boolean;
  urut: 'asc' | 'desc';
  onPageChange: (p: number) => void;
  onUrutChange: (u: 'asc' | 'desc') => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<OrderRow | null>(null);
  const [edit, setEdit] = useState<OrderRow | null>(null);
  const [hapus, setHapus] = useState<OrderRow | null>(null);
  const [reset, setReset] = useState<OrderRow | null>(null);
  const [tambah, setTambah] = useState(false);
  const mulai = (page - 1) * pageSize;

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <p className="text-sm text-muted-foreground">{total} toko terdaftar</p>
        {bisaUbah && (
          <Button className="h-11 gap-2" onClick={() => setTambah(true)}>
            <Plus className="size-4" />
            Tambah Master Data
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs">
          <p className="text-sm text-muted-foreground">
            {adaFilter
              ? 'Tidak ada toko yang cocok dengan filter ini.'
              : 'Belum ada master customer.'}
          </p>
        </div>
      ) : (
        <div className="min-w-0 rounded-2xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table className="min-w-[46rem]">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-4 pl-5">Depot</TableHead>
                  <TableHead className="py-4">Nama Customer</TableHead>
                  <TableHead className="py-4 text-center">Jumlah Dus</TableHead>
                  <TableHead className="py-4 text-center">
                    <button
                      type="button"
                      onClick={() => onUrutChange(urut === 'asc' ? 'desc' : 'asc')}
                      className="inline-flex items-center gap-1.5 rounded-md text-left transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      Pengambilan Terakhir
                      {urut === 'asc' ? (
                        <ArrowUp className="size-3.5" />
                      ) : (
                        <ArrowDown className="size-3.5" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="py-4 pr-5 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.customerId}
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat detail ${r.namaToko}`}
                    onClick={() => setDetail(r)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Spacebar' || e.key === ' ') {
                        e.preventDefault();
                        setDetail(r);
                      }
                    }}
                    className="cursor-pointer transition-colors hover:bg-secondary/50 focus-visible:bg-secondary focus-visible:outline-none"
                  >
                    <TableCell className="whitespace-nowrap py-4 pl-5 text-muted-foreground">
                      {r.depot ?? '-'}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <InitialAvatar nama={r.namaToko} className="size-9 text-[11px]" />
                        <div className="min-w-0">
                          <p className="font-medium leading-snug break-words">{r.namaToko}</p>
                          <p className="text-xs text-muted-foreground">{r.kodeSap}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <PillDus total={r.total} />
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <PillWaktu waktu={r.terakhir} kali={r.jumlahAdjustment} />
                    </TableCell>
                    <TableCell className="py-4 pr-5">
                      <div className="flex items-center justify-center gap-1.5">
                        {bisaUbah ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setHapus(r);
                              }}
                              aria-label={`Hapus ${r.namaToko}`}
                              title="Hapus"
                              className="grid size-10 place-items-center rounded-lg border border-border text-destructive transition-colors hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                              <Trash2 className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEdit(r);
                              }}
                              aria-label={`Ubah ${r.namaToko}`}
                              title="Ubah"
                              className="grid size-10 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                              <Pencil className="size-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">&mdash;</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
            <p className="text-xs text-muted-foreground">
              Menampilkan {mulai + 1}&ndash;{Math.min(mulai + rows.length, total)} dari {total} toko
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                aria-label="Halaman sebelumnya"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {page}/{totalPages}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                aria-label="Halaman berikutnya"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail ditutup lebih dulu sebelum edit/hapus dibuka: dua dialog
          bertumpuk membuat fokus keyboard terjebak di lapisan bawah. */}
      <DetailOrderDialog
        row={detail}
        bisaUbah={bisaUbah}
        onOpenChange={(v) => !v && setDetail(null)}
        onEdit={(r) => {
          setDetail(null);
          setEdit(r);
        }}
        onHapus={(r) => {
          setDetail(null);
          setHapus(r);
        }}
        onReset={(r) => {
          setDetail(null);
          setReset(r);
        }}
      />

      <EditOrderDialog
        row={edit}
        depots={depots}
        onOpenChange={(v) => !v && setEdit(null)}
        onSaved={onChanged}
      />

      <ResetOrderDialog
        row={reset}
        onOpenChange={(v) => !v && setReset(null)}
        onReset={onChanged}
      />

      <HapusCustomerDialog
        row={hapus}
        onOpenChange={(v) => !v && setHapus(null)}
        onDeleted={onChanged}
      />

      <MasterCustomerDialog open={tambah} onOpenChange={setTambah} onSaved={onChanged} />
    </>
  );
}
