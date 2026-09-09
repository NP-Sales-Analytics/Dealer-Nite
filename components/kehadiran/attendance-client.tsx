'use client';

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AttendanceTable } from './attendance-table';
import type { FilterOptions } from '@/app/api/dashboard/filters/route';
import {
  adaFilterAktif, FilterBar, FILTER_KOSONG, paramFilter, type FilterState,
} from '@/components/dashboard/filter-bar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/lib/use-debounce';
import type { AttendanceResponse } from '@/lib/dashboard/types';

const fetcher = <T,>(url: string) => async (): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  return res.json();
};

const buildQuery = (f: FilterState, page: number, urut: 'asc' | 'desc') => {
  const p = new URLSearchParams({ page: String(page) });
  if (urut === 'asc') p.set('sort', 'asc');
  return paramFilter(f, p).toString();
};

export function AttendanceClient({ bisaUbah }: { bisaUbah: boolean }) {
  const [filter, setFilter] = useState<FilterState>(FILTER_KOSONG);
  const [page, setPage] = useState(1);
  const [urut, setUrut] = useState<'asc' | 'desc'>('desc');
  const [mengunduh, setMengunduh] = useState(false);
  const queryClient = useQueryClient();

  // Ketikan di-debounce; region/depot langsung berlaku karena sekali klik.
  // Di-trim di sini, bukan hanya di buildQuery: kunci query yang menyimpan
  // "abc " terhitung beda dari "abc" dan memicu fetch untuk pencarian yang sama.
  const qDebounced = useDebounce(filter.q, 300).trim();
  const filterEfektif = useMemo(
    () => ({ ...filter, q: qDebounced }),
    [filter.wilayah, filter.region, filter.depot, qDebounced], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Filter berubah -> kembali ke halaman 1, kalau tidak nomor halaman bisa
  // menunjuk ke luar rentang hasil yang baru.
  useEffect(() => {
    setPage(1);
  }, [filterEfektif.wilayah, filterEfektif.region, filterEfektif.depot, filterEfektif.q]);

  const options = useQuery({
    queryKey: ['filters'],
    queryFn: fetcher<FilterOptions>('/api/dashboard/filters'),
    staleTime: 5 * 60_000,
  });

  const data = useQuery({
    queryKey: ['kehadiran', filterEfektif, page, urut],
    queryFn: fetcher<AttendanceResponse>(`/api/dashboard/recent?${buildQuery(filterEfektif, page, urut)}`),
    refetchInterval: 15_000,
    // Tahan hasil lama saat pindah halaman supaya tabel tidak berkedip kosong.
    placeholderData: keepPreviousData,
  });

  const namaDepot = useMemo(
    () => (options.data?.depots ?? []).map((d) => d.depot),
    [options.data],
  );

  const adaFilter = adaFilterAktif(filterEfektif);

  const jumlah = data.data?.total ?? 0;

  /**
   * Unduhan lewat fetch, bukan <a download> biasa.
   *
   * Berkasnya butuh cookie sesi dan bisa ditolak server (misal sesi habis);
   * dengan <a> kegagalan itu berakhir jadi tab kosong atau berkas rusak yang
   * baru ketahuan saat dibuka. Lewat fetch, gagalnya kelihatan sebagai pesan.
   */
  const unduh = async () => {
    setMengunduh(true);
    try {
      // Query string yang SAMA dengan tabel: yang terunduh persis yang terlihat.
      const res = await fetch(`/api/kehadiran/export?${buildQuery(filterEfektif, 1, urut)}`);
      if (!res.ok) throw new Error(String(res.status));

      const blob = await res.blob();
      const nama =
        res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1]
        ?? 'Kehadiran-Pylox.xlsx';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nama;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${jumlah} catatan kehadiran diunduh.`);
    } catch {
      toast.error('Gagal mengunduh. Coba lagi.');
    } finally {
      setMengunduh(false);
    }
  };

  return (
    <>
      <FilterBar
        value={filter}
        options={options.data}
        onChange={setFilter}
        withSearch
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data.data ? (
            <>
              <span className="font-semibold text-foreground tabular-nums">{jumlah}</span> catatan
              kehadiran{adaFilter && ' (tersaring)'}
            </>
          ) : (
            'Memuat...'
          )}
        </p>
        {/* Mengikuti filter yang sedang aktif - kalau daftarnya disaring per
            depot, yang terunduh juga depot itu saja. */}
        <Button
          variant="outline"
          onClick={unduh}
          disabled={mengunduh || jumlah === 0}
          title={jumlah === 0 ? 'Belum ada catatan untuk diunduh' : 'Unduh sebagai Excel'}
        >
          <Download className="size-4" />
          {mengunduh ? 'Menyiapkan...' : 'Download Excel'}
        </Button>
      </div>

      {data.isError ? (
        <p className="rounded-2xl border border-destructive/50 bg-card p-4 text-sm text-destructive">
          Gagal memuat daftar kehadiran. Halaman mencoba lagi otomatis setiap 15 detik.
        </p>
      ) : !data.data ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : (
        <AttendanceTable
          rows={data.data.rows}
          page={data.data.page}
          totalPages={data.data.totalPages}
          total={data.data.total}
          pageSize={data.data.pageSize}
          depots={namaDepot}
          adaFilter={adaFilter}
          bisaUbah={bisaUbah}
          urut={urut}
          onPageChange={setPage}
          onUrutChange={(v) => { setUrut(v); setPage(1); }}
          onChanged={() => queryClient.invalidateQueries()}
        />
      )}
    </>
  );
}
