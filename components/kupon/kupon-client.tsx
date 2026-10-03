'use client';

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, PackageCheck, Printer, X } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { KuponDialog } from './kupon-dialog';
import { BarProses, RasioKupon, STATUS_KUPON, WARNA } from './status';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import { adaFilterAktif, FilterBar, FILTER_KOSONG, lolosHadir, type FilterState } from '@/components/dashboard/filter-bar';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { TombolUnduh } from '@/components/shared/tombol-unduh';
import { DealerNightSelect } from '@/components/target/dealer-night-select';
import { ChipKupon, PillHadir } from '@/components/target/pills';
import type { DealerNightOption } from '@/components/target/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { KuponRow, TahapKupon } from '@/lib/kupon/service';
import { dnBawaan } from '@/lib/target/dn-bawaan';
import { KUPON_NOL, prosesKupon, totalKupon, type JumlahKupon, type StatusKupon } from '@/lib/target/kupon';
import { targetPollingInterval } from '@/lib/target/use-target-polling';
import { useDebounce } from '@/lib/use-debounce';
import { cn } from '@/lib/utils';

const PER_HALAMAN = 20;
const URUTAN_STATUS: StatusKupon[] = ['perlu_dibuat', 'siap_diberikan', 'selesai', 'belum_verifikasi'];

const tambah = (a: JumlahKupon, b: JumlahKupon) => ({ pink: a.pink + b.pink, hijau: a.hijau + b.hijau });

export function KuponClient({ dealerNights, canManage, canExport }: {
  dealerNights: DealerNightOption[];
  canManage: boolean;
  canExport: boolean;
}) {
  const [dealerNightId, setDealerNightId] = useState(() => dnBawaan(dealerNights));
  const [filter, setFilter] = useState<FilterState>(FILTER_KOSONG);
  const [status, setStatus] = useState<StatusKupon | 'semua'>('semua');
  const [page, setPage] = useState(1);
  const [pilih, setPilih] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['kupon', 'list', dealerNightId],
    enabled: !!dealerNightId,
    queryFn: async (): Promise<{ rows: KuponRow[] }> => {
      const response = await fetch(`/api/kupon/list?dealerNightId=${encodeURIComponent(dealerNightId)}`);
      if (!response.ok) throw new Error('Gagal memuat data kupon.');
      return response.json();
    },
    refetchInterval: targetPollingInterval,
    placeholderData: keepPreviousData,
  });

  const semua = useMemo(() => (query.data?.rows ?? []).map((row) => ({
    row,
    k: prosesKupon({ verified: row.verified, target: row.targetEfektif, dibuat: row.dibuat, diberikan: row.diberikan }),
  })), [query.data]);

  const q = useDebounce(filter.q, 250).trim().toLowerCase();
  useEffect(() => { setPage(1); setPilih(new Set()); }, [dealerNightId, filter.wilayah, filter.region, filter.depot, filter.hadir, q, status]);

  const options = useMemo<FilterOptions>(() => {
    const depots = [...new Map(semua.map(({ row }) => [row.depotName, { depot: row.depotName, region: row.region, wilayah: row.wilayah }])).values()];
    return {
      wilayahs: [...new Set(depots.map((d) => d.wilayah).filter((v): v is string => !!v))],
      regions: [...new Map(depots.filter((d) => d.region).map((d) => [d.region!, { region: d.region!, wilayah: d.wilayah }])).values()],
      depots,
    };
  }, [semua]);

  const tersaring = semua.filter(({ row }) =>
    (filter.wilayah.length === 0 || (!!row.wilayah && filter.wilayah.includes(row.wilayah)))
    && (filter.region.length === 0 || (!!row.region && filter.region.includes(row.region)))
    && (filter.depot.length === 0 || filter.depot.includes(row.depotName))
    && lolosHadir(filter, row.qtyHadir)
    && (!q || `${row.mgCode} ${row.mgName} ${row.nomorUndian ?? ''}`.toLowerCase().includes(q)));

  const ringkas = useMemo(() => {
    const total = { hak: KUPON_NOL, dibuat: KUPON_NOL, diberikan: KUPON_NOL, perluDibuat: KUPON_NOL, siapDiberikan: KUPON_NOL };
    const perStatus: Record<StatusKupon, number> = { belum_verifikasi: 0, perlu_dibuat: 0, siap_diberikan: 0, selesai: 0 };
    for (const { k } of tersaring) {
      total.hak = tambah(total.hak, k.hak);
      total.dibuat = tambah(total.dibuat, k.dibuat);
      total.diberikan = tambah(total.diberikan, k.diberikan);
      total.perluDibuat = tambah(total.perluDibuat, k.perluDibuat);
      total.siapDiberikan = tambah(total.siapDiberikan, k.siapDiberikan);
      perStatus[k.status] += 1;
    }
    return { total, perStatus };
  }, [tersaring]);

  const rows = tersaring
    .filter(({ k }) => status === 'semua' || k.status === status)
    .sort((a, b) => URUTAN_STATUS.indexOf(a.k.status) - URUTAN_STATUS.indexOf(b.k.status));
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_HALAMAN));
  const aman = Math.min(page, totalPages);
  const tampil = rows.slice((aman - 1) * PER_HALAMAN, aman * PER_HALAMAN);
  const adaFilter = adaFilterAktif({ ...filter, q }) || status !== 'semua';

  const terpilih = rows.filter(({ row }) => pilih.has(row.customerId));
  const bisaMassal = (tahap: TahapKupon) => terpilih.some(({ k }) => totalKupon(tahap === 'dibuat' ? k.perluDibuat : k.siapDiberikan) > 0);
  const semuaHalamanTerpilih = tampil.length > 0 && tampil.every(({ row }) => pilih.has(row.customerId));

  const segarkan = () => queryClient.invalidateQueries({ queryKey: ['kupon'] });

  const massal = (tahap: TahapKupon) => start(async () => {
    const response = await fetch('/api/kupon/massal', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dealerNightId, tahap, customerIds: terpilih.map(({ row }) => row.customerId) }),
    }).catch(() => null);
    const body = await response?.json().catch(() => ({}));
    if (!response?.ok) {
      toast.error(body?.error ?? 'Gagal memproses kupon.');
      return;
    }
    toast.success(`${body.diproses} toko ${tahap === 'dibuat' ? 'ditandai kuponnya dibuat' : 'ditandai kuponnya diberikan'}${body.dilewati ? `, ${body.dilewati} dilewati` : ''}.`);
    setPilih(new Set());
    segarkan();
  });

  const detailRow = semua.find(({ row }) => row.customerId === detail)?.row;

  return (
    <div className="space-y-4 pb-24 sm:space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{tersaring.length - ringkas.perStatus.belum_verifikasi}</span> toko berhak kupon
          {' · '}<span className="tabular-nums">{ringkas.perStatus.belum_verifikasi}</span> menunggu verifikasi
        </p>
        {canExport && dealerNightId && (
          <TombolUnduh
            url={`/api/kupon/export?dealerNightId=${encodeURIComponent(dealerNightId)}`}
            namaBawaan="detail-kupon.csv"
            jumlah={semua.length}
            label="Download CSV"
            className="h-11 gap-2"
          />
        )}
      </div>

      {/* Pipeline per warna: hak -> dibuat -> diberikan */}
      <div className="grid gap-3 lg:grid-cols-2">
        {(['pink', 'hijau'] as const).map((warna) => {
          const t = ringkas.total;
          const persen = (n: number) => (t.hak[warna] ? Math.round((n / t.hak[warna]) * 100) : 0);
          return (
            <div key={warna} className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
              <div className={cn('pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-50 blur-2xl', warna === 'pink' ? 'bg-pink-300' : 'bg-emerald-300')} aria-hidden />
              <div className="relative flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <span className={cn('size-2.5 rounded-full', WARNA[warna].dot)} aria-hidden />
                    Kupon {WARNA[warna].label}
                  </p>
                  <p className="text-xs text-muted-foreground">1 kupon per {WARNA[warna].nilai} target</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold tabular-nums">{t.hak[warna]}</p>
                  <p className="text-xs text-muted-foreground">total hak</p>
                </div>
              </div>
              <div className="relative mt-4"><BarProses warna={warna} hak={t.hak[warna]} dibuat={t.dibuat[warna]} diberikan={t.diberikan[warna]} /></div>
              <dl className="relative mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Dibuat', t.dibuat[warna], `${persen(t.dibuat[warna])}% dari hak`, ''],
                  ['Diberikan', t.diberikan[warna], `${persen(t.diberikan[warna])}% dari hak`, ''],
                  ['Perlu dibuat', t.perluDibuat[warna], 'belum dicetak', t.perluDibuat[warna] ? 'text-sky-600' : ''],
                  ['Siap diberikan', t.siapDiberikan[warna], 'sudah dicetak', t.siapDiberikan[warna] ? 'text-violet-600' : ''],
                ].map(([label, nilai, sub, warnaTeks]) => (
                  <div key={label as string}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className={cn('text-lg font-bold tabular-nums', warnaTeks as string)}>{nilai}</dd>
                    <dd className="text-[11px] text-muted-foreground">{sub}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>

      {/* Status sebagai tab + ringkasan */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {(['perlu_dibuat', 'siap_diberikan', 'selesai', 'belum_verifikasi'] as const).map((key) => {
          const meta = STATUS_KUPON[key];
          const Icon = meta.icon;
          const aktif = status === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={aktif}
              onClick={() => setStatus(aktif ? 'semua' : key)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-left shadow-xs transition-all hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                aktif ? 'border-primary ring-2 ring-primary/20' : 'border-border',
              )}
            >
              <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', meta.tile)} aria-hidden>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-bold leading-tight tabular-nums">{ringkas.perStatus[key]}</span>
                <span className="block truncate text-xs text-muted-foreground">{meta.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <FilterBar
        value={filter}
        options={options}
        onChange={setFilter}
        withSearch
        withKehadiran
        searchPlaceholder="Cari toko, MG Code, atau nomor undian..."
        awal={(
          <DealerNightSelect
            options={dealerNights}
            value={dealerNightId}
            onChange={(id) => { setDealerNightId(id); setFilter(FILTER_KOSONG); setStatus('semua'); }}
            className="min-w-0 basis-full sm:basis-auto sm:w-40 sm:flex-none"
          />
        )}
      />

      {!dealerNightId ? (
        <p className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Belum ada Dealer Night aktif.</p>
      ) : query.isError ? (
        <p className="rounded-2xl border border-destructive/50 bg-card p-4 text-sm text-destructive">Gagal memuat data kupon. Sistem mencoba lagi otomatis.</p>
      ) : !query.data ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-xs">
          <p className="font-medium">{adaFilter ? 'Tidak ada toko yang cocok' : 'Belum ada master toko'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{adaFilter ? 'Coba ganti status, filter, atau kata kunci.' : 'Master toko DN ini belum diunggah.'}</p>
        </div>
      ) : (
        <div className="min-w-0 rounded-2xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <Table className="min-w-[62rem]">
              <TableHeader>
                <TableRow>
                  {canManage && (
                    <TableHead className="w-12 py-4 pl-5">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua di halaman ini"
                        checked={semuaHalamanTerpilih}
                        onChange={() => setPilih((lama) => {
                          const baru = new Set(lama);
                          for (const { row } of tampil) {
                            if (semuaHalamanTerpilih) baru.delete(row.customerId); else baru.add(row.customerId);
                          }
                          return baru;
                        })}
                        className="size-4 accent-primary"
                      />
                    </TableHead>
                  )}
                  <TableHead className={cn('py-4', !canManage && 'pl-5')}>Nama Customer</TableHead>
                  <TableHead className="py-4 text-center">Kehadiran</TableHead>
                  <TableHead className="py-4 text-center">Hak Kupon</TableHead>
                  <TableHead className="py-4 text-center">Dibuat</TableHead>
                  <TableHead className="py-4 text-center">Diberikan</TableHead>
                  <TableHead className="py-4 pr-5 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tampil.map(({ row, k }) => (
                  <TableRow
                    key={row.customerId}
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat kupon ${row.mgName}`}
                    onClick={() => setDetail(row.customerId)}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setDetail(row.customerId); } }}
                    className={cn('cursor-pointer transition-colors hover:bg-secondary/50 focus-visible:bg-secondary focus-visible:outline-none', pilih.has(row.customerId) && 'bg-primary/5')}
                  >
                    {canManage && (
                      <TableCell className="py-4 pl-5" onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${row.mgName}`}
                          checked={pilih.has(row.customerId)}
                          onChange={() => setPilih((lama) => {
                            const baru = new Set(lama);
                            if (baru.has(row.customerId)) baru.delete(row.customerId); else baru.add(row.customerId);
                            return baru;
                          })}
                          className="size-4 accent-primary"
                        />
                      </TableCell>
                    )}
                    <TableCell className={cn('py-4', !canManage && 'pl-5')}>
                      <div className="flex items-center gap-3">
                        <InitialAvatar nama={row.mgName} className="size-9 text-[11px]" />
                        <div className="min-w-0">
                          <p className="font-medium leading-snug break-words">{row.mgName}</p>
                          <p className="text-xs text-muted-foreground"><span className="tabular-nums">{row.mgCode}</span> · {row.depotName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <PillHadir qtyHadir={row.qtyHadir} />
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      {k.status === 'belum_verifikasi' ? <span className="text-muted-foreground">&mdash;</span> : (
                        <span className="inline-flex flex-wrap justify-center gap-1.5">
                          <ChipKupon warna="pink" jumlah={k.hak.pink} />
                          <ChipKupon warna="hijau" jumlah={k.hak.hijau} />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 text-center">{k.status === 'belum_verifikasi' ? <span className="text-muted-foreground">&mdash;</span> : <RasioKupon nilai={k.dibuat} dari={k.hak} />}</TableCell>
                    <TableCell className="py-4 text-center">{k.status === 'belum_verifikasi' ? <span className="text-muted-foreground">&mdash;</span> : <RasioKupon nilai={k.diberikan} dari={k.hak} />}</TableCell>
                    <TableCell className="py-4 pr-5 text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          'h-9 gap-1.5 px-3',
                          canManage && k.status === 'perlu_dibuat' && 'border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 dark:bg-sky-500/10 dark:text-sky-300',
                          canManage && k.status === 'siap_diberikan' && 'border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:text-violet-800 dark:bg-violet-500/10 dark:text-violet-300',
                          k.status === 'selesai' && 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300',
                          k.status === 'belum_verifikasi' && 'border-dashed text-muted-foreground',
                        )}
                        onClick={(event) => { event.stopPropagation(); setDetail(row.customerId); }}
                      >
                        {k.status === 'perlu_dibuat' ? <><Printer className="size-4" />{canManage ? 'Buat' : 'Perlu dibuat'}</>
                          : k.status === 'siap_diberikan' ? <><PackageCheck className="size-4" />{canManage ? 'Berikan' : 'Siap diberikan'}</>
                            : k.status === 'selesai' ? <><CheckCircle2 className="size-4" />Selesai</>
                              : <><Clock3 className="size-4" />Belum verifikasi</>}
                      </Button>
                    </TableCell>
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
              <button type="button" onClick={() => setPage(aman - 1)} disabled={aman <= 1} aria-label="Halaman sebelumnya" className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40">
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">{aman}/{totalPages}</span>
              <button type="button" onClick={() => setPage(aman + 1)} disabled={aman >= totalPages} aria-label="Halaman berikutnya" className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-40">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bilah aksi massal mengambang saat ada toko terpilih */}
      {canManage && terpilih.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="flex w-full max-w-2xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 p-2.5 pl-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
            <p className="mr-auto text-sm"><span className="font-bold tabular-nums">{terpilih.length}</span> toko dipilih</p>
            <Button variant="outline" className="h-10 gap-1.5" disabled={pending || !bisaMassal('dibuat')} onClick={() => massal('dibuat')}>
              <Printer className="size-4" />
              Tandai Dibuat
            </Button>
            <Button className="h-10 gap-1.5" disabled={pending || !bisaMassal('diberikan')} onClick={() => massal('diberikan')}>
              <PackageCheck className="size-4" />
              Tandai Diberikan
            </Button>
            <button type="button" onClick={() => setPilih(new Set())} aria-label="Batalkan pilihan" className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-secondary">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {detailRow && (
        <KuponDialog
          key={`${detailRow.customerId}-${totalKupon(detailRow.dibuat)}-${totalKupon(detailRow.diberikan)}-${detailRow.targetEfektif}`}
          row={detailRow}
          canManage={canManage}
          onOpenChange={(open) => !open && setDetail(null)}
          onChanged={segarkan}
        />
      )}
    </div>
  );
}
