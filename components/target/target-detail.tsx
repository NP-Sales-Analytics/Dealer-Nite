'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck, ChevronLeft, ChevronRight, FileUp, Pencil, Plus, SlidersHorizontal, Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DealerNightSelect } from './dealer-night-select';
import { MasterTokoDialog } from './master-toko-dialog';
import { PillHadir, PillStatus } from './pills';
import { TargetAdjustmentDialog } from './target-adjustment-dialog';
import { TargetDetailDialog } from './target-detail-dialog';
import { hitungKpiTarget, TargetKpi } from './target-kpi';
import type { DealerNightOption, TargetResponse, TargetRow } from './types';
import { UploadMasterDialog } from './upload-master-dialog';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import { adaFilterAktif, FilterBar, FILTER_KOSONG, type FilterState } from '@/components/dashboard/filter-bar';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { TombolUnduh } from '@/components/shared/tombol-unduh';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dnBawaan } from '@/lib/target/dn-bawaan';
import { formatRupiah, formatRupiahRingkas } from '@/lib/target/money';
import { targetPollingInterval, useTargetVisibilityRefresh } from '@/lib/target/use-target-polling';
import { useDebounce } from '@/lib/use-debounce';
import { cn } from '@/lib/utils';

const PER_HALAMAN = 20;
type Status = 'semua' | 'belum' | 'sudah';

const cocok = (row: TargetRow, f: FilterState, q: string) =>
  (f.wilayah.length === 0 || (!!row.wilayah && f.wilayah.includes(row.wilayah)))
  && (f.region.length === 0 || (!!row.region && f.region.includes(row.region)))
  && (f.depot.length === 0 || f.depot.includes(row.depotName))
  && (!q || `${row.mgCode} ${row.mgName} ${row.sotpCode} ${row.sotpName} ${row.salesman ?? ''} ${row.spv ?? ''}`
    .toLowerCase().includes(q));

/** Target yang disepakati admin DN saat verifikasi; sebelum itu yang ada hanya target pusat. */
function KolomTerverifikasi({ row }: { row: TargetRow }) {
  if (row.targetVerifikasi == null) {
    return (
      <div className="flex flex-col items-end gap-1">
        <PillStatus verified={false} />
        <span className="text-xs tabular-nums text-muted-foreground">Pusat {formatRupiahRingkas(row.targetAwal)}</span>
      </div>
    );
  }
  const ubah = row.targetVerifikasi - row.targetAwal;
  return (
    <div className="text-right">
      <p className="font-bold tabular-nums" title={formatRupiah(row.targetVerifikasi)}>{formatRupiahRingkas(row.targetVerifikasi)}</p>
      <p className="text-xs tabular-nums text-muted-foreground">
        {ubah === 0 ? 'sama dengan pusat' : `${ubah > 0 ? '+' : ''}${formatRupiahRingkas(ubah)} dari pusat`}
      </p>
    </div>
  );
}

/** Penambahan omset setelah verifikasi beserta target terakhirnya. */
function KolomPenambahan({ row }: { row: TargetRow }) {
  if (row.targetVerifikasi == null) return <span className="text-muted-foreground">&mdash;</span>;
  const tambah = row.targetEfektif - row.targetVerifikasi;
  if (tambah === 0) return <span className="text-sm text-muted-foreground">Belum ada</span>;
  return (
    <div className="text-right">
      <span
        className={cn(
          'inline-flex rounded-full px-2.5 py-1 text-sm font-bold tabular-nums',
          tambah > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        )}
        title={formatRupiah(tambah)}
      >
        {tambah > 0 ? '+' : ''}{formatRupiahRingkas(tambah)}
      </span>
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">jadi {formatRupiahRingkas(row.targetEfektif)}</p>
    </div>
  );
}

function IkonAksi({ label, onClick, danger, children }: {
  label: string; onClick: () => void; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onClick(); }}
      aria-label={label}
      title={label}
      className={cn(
        'grid size-9 place-items-center rounded-lg border border-border transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        danger ? 'text-destructive hover:bg-destructive/10' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function TargetDetail({
  dealerNights,
  canAdjust,
  canManage,
  canExport,
  canSetting,
}: {
  dealerNights: DealerNightOption[];
  canAdjust: boolean;
  canManage: boolean;
  canExport: boolean;
  canSetting: boolean;
}) {
  const [dealerNightId, setDealerNightId] = useState(() => dnBawaan(dealerNights));
  const [filter, setFilter] = useState<FilterState>(FILTER_KOSONG);
  const [status, setStatus] = useState<Status>('semua');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<TargetRow | null>(null);
  const [adjust, setAdjust] = useState<TargetRow | null>(null);
  const [master, setMaster] = useState<TargetRow | 'baru' | null>(null);
  const [upload, setUpload] = useState(false);
  const [hapus, setHapus] = useState<TargetRow | null>(null);
  const queryClient = useQueryClient();
  useTargetVisibilityRefresh(queryClient);

  const query = useQuery({
    queryKey: ['targets', 'list', dealerNightId],
    enabled: !!dealerNightId,
    queryFn: async (): Promise<TargetResponse> => {
      const response = await fetch(`/api/targets/list?dealerNightId=${encodeURIComponent(dealerNightId)}`);
      if (!response.ok) throw new Error('Gagal memuat Target DN.');
      return response.json();
    },
    refetchInterval: targetPollingInterval,
    placeholderData: keepPreviousData,
  });
  const semua = useMemo(() => query.data?.rows ?? [], [query.data]);
  const q = useDebounce(filter.q, 250).trim().toLowerCase();
  useEffect(() => setPage(1), [dealerNightId, filter.wilayah, filter.region, filter.depot, q, status]);

  const options = useMemo<FilterOptions>(() => {
    const depots = [...new Map(semua.map((row) => [row.depotName, {
      depot: row.depotName, region: row.region, wilayah: row.wilayah,
    }])).values()];
    return {
      wilayahs: [...new Set(depots.map((row) => row.wilayah).filter((v): v is string => !!v))],
      regions: [...new Map(depots.filter((row) => row.region).map((row) => [row.region!, {
        region: row.region!, wilayah: row.wilayah,
      }])).values()],
      depots,
    };
  }, [semua]);

  const tersaring = useMemo(() => semua.filter((row) => cocok(row, filter, q)), [semua, filter, q]);
  const jumlah = {
    semua: tersaring.length,
    belum: tersaring.filter((row) => !row.verifiedAt).length,
    sudah: tersaring.filter((row) => row.verifiedAt).length,
  };
  const rows = tersaring.filter((row) => status === 'semua' || (status === 'sudah') === !!row.verifiedAt);
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_HALAMAN));
  const aman = Math.min(page, totalPages);
  const tampil = rows.slice((aman - 1) * PER_HALAMAN, aman * PER_HALAMAN);

  const targetDn = dealerNights.find((item) => item.id === dealerNightId)?.targetDn ?? 0;
  const kpi = useMemo(() => hitungKpiTarget(semua, targetDn), [semua, targetDn]);

  const segarkan = () => queryClient.invalidateQueries({ queryKey: ['targets'] });
  const adaFilter = adaFilterAktif({ ...filter, q }) || status !== 'semua';

  async function hapusToko(row: TargetRow) {
    const response = await fetch(`/api/master/${row.customerId}`, { method: 'DELETE' }).catch(() => null);
    if (!response?.ok) {
      toast.error('Gagal menghapus toko.');
      return;
    }
    toast.success(`${row.mgName} dihapus.`);
    segarkan();
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{semua.length}</span> toko terdaftar
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {canExport && dealerNightId && (
            <TombolUnduh
              url={`/api/targets/export?dealerNightId=${encodeURIComponent(dealerNightId)}`}
              namaBawaan="target-dn.csv"
              jumlah={semua.length}
              label="Download CSV"
              className="h-11 gap-2"
            />
          )}
          {canManage && (
            <>
              <Button variant="outline" className="h-11 gap-2" onClick={() => setUpload(true)}>
                <FileUp className="size-4" />
                Upload Master
              </Button>
              <Button className="h-11 gap-2" onClick={() => setMaster('baru')}>
                <Plus className="size-4" />
                Tambah Master Data
              </Button>
            </>
          )}
        </div>
      </div>

      <TargetKpi kpi={kpi} bisaAtur={canSetting} />

      <FilterBar
        value={filter}
        options={options}
        onChange={setFilter}
        withSearch
        searchPlaceholder="Cari toko, MG Code, salesman, atau SPV..."
        awal={(
          <DealerNightSelect
            options={dealerNights}
            value={dealerNightId}
            onChange={(id) => { setDealerNightId(id); setFilter(FILTER_KOSONG); setStatus('semua'); }}
            className="min-w-0 basis-full sm:basis-auto sm:w-44 sm:flex-none"
          />
        )}
      />

      <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-xs" role="tablist">
        {([['semua', 'Semua'], ['belum', 'Belum Verifikasi'], ['sudah', 'Terverifikasi']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={status === key}
            onClick={() => setStatus(key)}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              status === key ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            {label}
            <span className={cn('rounded-full px-1.5 text-xs tabular-nums', status === key ? 'bg-primary-foreground/20' : 'bg-secondary')}>
              {jumlah[key]}
            </span>
          </button>
        ))}
      </div>

      {!dealerNightId ? (
        <p className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Belum ada Dealer Night aktif.</p>
      ) : query.isError ? (
        <p className="rounded-2xl border border-destructive/50 bg-card p-4 text-sm text-destructive">Gagal memuat Target DN. Sistem mencoba lagi otomatis.</p>
      ) : !query.data ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs">
          <p className="font-medium">{adaFilter ? 'Tidak ada toko yang cocok' : 'Belum ada master toko'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {adaFilter ? 'Coba ganti filter atau kata kunci.' : canManage ? 'Tambahkan toko satu per satu atau upload file master.' : 'Master toko DN ini belum diunggah tim pusat.'}
          </p>
        </div>
      ) : (
        <div className="min-w-0 rounded-2xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table className="min-w-[68rem]">
              <TableHeader>
                <TableRow>
                  <TableHead className="py-4 pl-5">Depot</TableHead>
                  <TableHead className="py-4">Nama Customer</TableHead>
                  <TableHead className="py-4 text-center">Kehadiran</TableHead>
                  <TableHead className="py-4 text-right">Target DN Terverifikasi</TableHead>
                  <TableHead className="py-4 text-right">Penambahan / Penyesuaian</TableHead>
                  <TableHead className="py-4 text-center">Banyak Penyesuaian</TableHead>
                  {(canAdjust || canManage) && <TableHead className="py-4 pr-5 text-center">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tampil.map((row) => (
                  <TableRow
                    key={row.customerId}
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat detail ${row.mgName}`}
                    onClick={() => setDetail(row)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setDetail(row); }
                    }}
                    className="cursor-pointer transition-colors hover:bg-secondary/50 focus-visible:bg-secondary focus-visible:outline-none"
                  >
                    <TableCell className="whitespace-nowrap py-4 pl-5 text-muted-foreground">{row.depotName}</TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <InitialAvatar nama={row.mgName} className="size-9 text-[11px]" />
                        <div className="min-w-0">
                          <p className="font-medium leading-snug break-words">{row.mgName}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">{row.mgCode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center"><PillHadir qtyHadir={row.qtyHadir} /></TableCell>
                    <TableCell className="py-4 text-right"><KolomTerverifikasi row={row} /></TableCell>
                    <TableCell className="py-4 text-right"><KolomPenambahan row={row} /></TableCell>
                    <TableCell className="py-4 text-center">
                      <span
                        className={cn(
                          'inline-flex min-w-9 justify-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
                          row.jumlahPenyesuaian > 0 ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground',
                        )}
                        title="Jumlah penyesuaian setelah verifikasi"
                      >
                        {row.jumlahPenyesuaian}x
                      </span>
                    </TableCell>
                    {(canAdjust || canManage) && (
                      <TableCell className="py-4 pr-5">
                        <div className="flex items-center justify-center gap-1.5">
                          {canAdjust && (row.verifiedAt ? (
                            <IkonAksi label={`Sesuaikan target ${row.mgName}`} onClick={() => setAdjust(row)}>
                              <SlidersHorizontal className="size-4" />
                            </IkonAksi>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 gap-1.5 border-primary/30 bg-primary/5 px-3 text-primary hover:bg-primary/10 hover:text-primary"
                              onClick={(event) => { event.stopPropagation(); setAdjust(row); }}
                            >
                              <BadgeCheck className="size-4" />
                              Verifikasi
                            </Button>
                          ))}
                          {canManage && (
                            <>
                              <IkonAksi label={`Edit data ${row.mgName}`} onClick={() => setMaster(row)}>
                                <Pencil className="size-4" />
                              </IkonAksi>
                              <IkonAksi label={`Hapus ${row.mgName}`} onClick={() => setHapus(row)} danger>
                                <Trash2 className="size-4" />
                              </IkonAksi>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3.5">
            <p className="text-xs text-muted-foreground">
              Menampilkan {(aman - 1) * PER_HALAMAN + 1}&ndash;{Math.min(aman * PER_HALAMAN, rows.length)} dari {rows.length} toko
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(aman - 1)}
                disabled={aman <= 1}
                aria-label="Halaman sebelumnya"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">{aman}/{totalPages}</span>
              <button
                type="button"
                onClick={() => setPage(aman + 1)}
                disabled={aman >= totalPages}
                aria-label="Halaman berikutnya"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail ditutup dulu sebelum dialog lain dibuka supaya fokus tidak terjebak. */}
      {detail && (
        <TargetDetailDialog
          key={detail.customerId}
          row={semua.find((row) => row.customerId === detail.customerId) ?? detail}
          canAdjust={canAdjust}
          canManage={canManage}
          onOpenChange={(open) => !open && setDetail(null)}
          onAdjust={(row) => { setDetail(null); setAdjust(row); }}
          onEdit={(row) => { setDetail(null); setMaster(row); }}
          onHapus={(row) => { setDetail(null); setHapus(row); }}
        />
      )}
      {adjust && (
        <TargetAdjustmentDialog key={adjust.customerId} row={adjust} onOpenChange={(open) => !open && setAdjust(null)} onSaved={segarkan} />
      )}
      {master && (
        <MasterTokoDialog
          key={master === 'baru' ? 'baru' : master.customerId}
          row={master === 'baru' ? null : master}
          dealerNights={dealerNights}
          initialDealerNightId={dealerNightId}
          onOpenChange={(open) => !open && setMaster(null)}
          onSaved={segarkan}
        />
      )}
      {upload && (
        <UploadMasterDialog
          dealerNights={dealerNights}
          initialDealerNightId={dealerNightId}
          onOpenChange={setUpload}
          onSaved={segarkan}
        />
      )}

      <AlertDialog open={hapus !== null} onOpenChange={(open) => !open && setHapus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus toko ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {hapus?.mgName} akan dihapus dari master DN ini beserta riwayat penyesuaian target dan
              catatan kehadirannya. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 bg-destructive text-white hover:bg-destructive/90"
              onClick={() => { const row = hapus; setHapus(null); if (row) void hapusToko(row); }}
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
