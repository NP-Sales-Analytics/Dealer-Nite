'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Sepadan dengan cache 15 detik di sisi server: pindah filter bolak-balik
        // dalam rentang ini dilayani dari memori, bukan request baru.
        staleTime: 10_000,
        retry: 1,
        // Kembali ke tab atau wifi tersambung lagi bukan alasan menembak ulang
        // semua query; halaman yang butuh segar sudah punya refetchInterval sendiri.
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
