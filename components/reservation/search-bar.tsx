'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  const debounced = useDebounce(term, 300);

  const { data, isFetching } = useQuery({
    queryKey: ['customer-search', debounced],
    enabled: debounced.trim().length >= 2,
    queryFn: async (): Promise<{ results: CustomerSearchResult[] }> => {
      const res = await fetch(`/api/customers/search?q=${encodeURIComponent(debounced)}`);
      if (!res.ok) throw new Error('Pencarian gagal');
      return res.json();
    },
  });

  const results = data?.results ?? [];

  return (
    <div className="space-y-2">
      <Input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Ketik nama toko atau kode SAP..."
        autoFocus
      />
      {debounced.trim().length >= 2 && (
        <div className="rounded-md border">
          {isFetching && results.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Mencari...</p>
          )}
          {!isFetching && results.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">Tidak ada hasil.</p>
          )}
          <ul className="divide-y">
            {results.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { onSelect(c); setTerm(''); }}
                  className="flex w-full flex-col items-start gap-0.5 p-3 text-left hover:bg-muted"
                >
                  <span className="flex items-center gap-2 font-medium">
                    {c.namaToko}
                    {c.sudahHadir && <Badge variant="secondary">Sudah dicatat</Badge>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {c.kodeSap} · {c.depot ?? '-'} · {c.wilayah ?? '-'} / {c.region ?? '-'} · undangan {c.qtyUndangan} orang
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
