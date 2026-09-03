'use client';

import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/lib/use-debounce';

export type CustomerSearchResult = {
  id: string;
  namaToko: string;
  kodeSap: string;
  depot: string | null;
  wilayah: string | null;
  region: string | null;
  namaPemilik: string | null;
  qtyUndangan: number;
  sudahHadir: boolean;
  qtyHadirSebelumnya: number | null;
};

export function SearchBar({ onSelect }: { onSelect: (c: CustomerSearchResult) => void }) {
  const [term, setTerm] = useState('');
  // Kunci query memakai nilai yang sudah di-debounce DAN sudah di-trim: tanpa
  // trim, "toko" dan "toko " jadi dua kunci berbeda untuk pencarian yang sama.
  const q = useDebounce(term, 300).trim();
  const cukupPanjang = q.length >= 2;

  const { data, isFetching } = useQuery({
    queryKey: ['customer-search', q],
    enabled: cukupPanjang,
    // Menghapus lalu mengetik ulang kata yang sama dalam 30 detik tidak menembak
    // server lagi - hasilnya diambil dari cache untuk kunci yang sama.
    staleTime: 30_000,
    queryFn: async (): Promise<{ results: CustomerSearchResult[] }> => {
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Pencarian gagal');
      return res.json();
    },
  });

  const results = data?.results ?? [];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Ketik nama toko atau kode SAP..."
          autoFocus
          autoComplete="off"
          aria-label="Cari toko"
          className="h-12 w-full rounded-xl border border-border bg-card pl-12 pr-12 text-base shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
        />
        {term && (
          <button
            type="button"
            onClick={() => setTerm('')}
            aria-label="Hapus pencarian"
            className="absolute right-0 top-0 grid h-12 w-12 place-items-center text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {cukupPanjang && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          {isFetching && results.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Mencari...</p>
          )}
          {!isFetching && results.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">
              Tidak ada hasil. Coba kata lain, atau tambahkan manual.
            </p>
          )}
          <ul className="divide-y divide-border">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { onSelect(c); setTerm(''); }}
                  className="flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition-colors hover:bg-secondary/60 active:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                >
                  <span className="flex w-full flex-wrap items-center gap-2">
                    <span className="font-medium leading-snug">{c.namaToko}</span>
                    {c.sudahHadir && (
                      <Badge variant="secondary" className="shrink-0">Sudah dicatat</Badge>
                    )}
                  </span>
                  <span className="text-xs leading-relaxed text-muted-foreground">
                    {c.kodeSap} · {c.depot ?? '-'} · {c.wilayah ?? '-'} / {c.region ?? '-'}
                    {' · '}
                    <span className="font-medium text-foreground">undangan {c.qtyUndangan} orang</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
