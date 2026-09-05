'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const TUNDA_MS = 3_000;
const JITTER_MS = 1_500;

/**
 * Panggil onChange setiap ada insert di order_adjustments. Payload diabaikan:
 * ini cuma sinyal "ambil ulang", karena leaderboard/total dihitung di server.
 * Polling di komponen tetap jadi cadangan bila koneksi realtime putus (spec 6).
 *
 * Peredamnya penting: satu order masuk disiarkan ke SEMUA klien, dan tiap klien
 * akan refetch. Tanpa penundaan, beban tumbuh sebagai
 * (jumlah penonton x jumlah order per menit) - kuadratik terhadap jumlah tamu,
 * karena keduanya naik bersamaan. Debounce trailing membuat ledakan 20 insert
 * menjadi SATU refetch per klien, dan jitter acak mencegah ratusan klien
 * menembak pada milidetik yang sama saat timernya jatuh tempo.
 */
export function useRealtimeRefresh(onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const jadwalkan = () => {
      // Sudah ada yang menunggu: event ini ikut terserap ke sana.
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        cb.current();
      }, TUNDA_MS + Math.random() * JITTER_MS);
    };

    const channel = supabase
      .channel('order_adjustments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'order_adjustments' },
        jadwalkan,
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);
}
