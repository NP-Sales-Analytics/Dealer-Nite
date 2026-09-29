'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Pindah filter bolak-balik dalam rentang ini dilayani dari memori,
        // bukan request baru. Tidak mengganggu kesegaran leaderboard: baik
        // invalidasi manual maupun refetchInterval mengabaikan
        // staleTime, jadi yang terpengaruh hanya refetch saat komponen mount.
        staleTime: 10_000,
        // Tanpa retry: saat server sedang kepayahan, mencoba ulang hanya
        // menggandakan beban, sementara tick interval berikutnya toh hanya
        // beberapa detik lagi.
        retry: 0,
        // Kembali ke tab atau wifi tersambung lagi bukan alasan menembak ulang
        // semua query; halaman yang butuh segar sudah punya refetchInterval sendiri.
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
