'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const TUNDA_MS = 1_500;
const JITTER_MS = 1_000;

/** Selang polling cadangan saat realtime PUTUS - jalur utama sedang mati. */
export const POLL_PUTUS_MS = 10_000;
/** Selang polling saat realtime hidup: jaring pengaman saja, bukan jalur utama. */
export const POLL_TERSAMBUNG_MS = 60_000;

/**
 * Panggil onChange setiap ada insert di order_adjustments. Payload diabaikan:
 * ini cuma sinyal "ambil ulang", karena leaderboard/total dihitung di server.
 *
 * Peredamnya penting: satu order masuk disiarkan ke SEMUA klien, dan tiap klien
 * akan refetch. Tanpa penundaan, beban tumbuh sebagai
 * (jumlah penonton x jumlah order per menit) - kuadratik terhadap jumlah tamu,
 * karena keduanya naik bersamaan. Debounce trailing membuat ledakan 20 insert
 * menjadi SATU refetch per klien, dan jitter acak mencegah ratusan klien
 * menembak pada milidetik yang sama saat timernya jatuh tempo.
 *
 * 1,5 detik (dari 3) adalah kompromi sadar: cukup cepat supaya perubahan terlihat
 * di device lain dalam hitungan detik, tapi tetap membatasi tiap klien maksimal
 * satu refetch per 1,5 detik saat order masuk beruntun.
 *
 * Mengembalikan status koneksi supaya pemanggil bisa menaikkan laju polling
 * cadangan HANYA saat realtime benar-benar putus - lihat POLL_* di atas. Tanpa
 * ini, kegagalan realtime tidak terlihat sama sekali: aplikasi cuma terasa lambat
 * tanpa ada yang tahu kenapa.
 */
export function useRealtimeRefresh(onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const [tersambung, setTersambung] = useState(false);

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
      .subscribe((status) => {
        const hidup = status === 'SUBSCRIBED';
        setTersambung(hidup);
        // Saat koneksi baru pulih, isi layar bisa saja sudah tertinggal jauh -
        // sinyal yang lewat selama putus tidak dikirim ulang oleh Supabase.
        if (hidup) jadwalkan();
      });

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  return { tersambung };
}

/** Selang polling cadangan sesuai status realtime. */
export const selangPolling = (tersambung: boolean) =>
  tersambung ? POLL_TERSAMBUNG_MS : POLL_PUTUS_MS;
