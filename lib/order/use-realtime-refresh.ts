'use client';

import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannelLifecycle } from '@/lib/order/realtime-channel-lifecycle';

const TUNDA_MS = 1_500;
const JITTER_MS = 1_000;

/** Selang polling cadangan saat realtime PUTUS - jalur utama sedang mati. */
export const POLL_PUTUS_MS = 10_000;
/**
 * Selang polling saat realtime hidup: jaring pengaman saja, bukan jalur utama.
 *
 * 30 detik, bukan 60. Status SUBSCRIBED hanya membuktikan koneksinya pernah
 * terbentuk - bukan bahwa event masih mengalir. Koneksi bisa jadi zombie tanpa
 * memberi tahu siapa pun, dan klien akan terus mengira dirinya sehat. Kalau
 * pada saat itu pollingnya 60 detik, aplikasi justru jadi DUA KALI lebih lambat
 * daripada sebelum sinkronisasi realtime diperbaiki.
 *
 * Harganya sepele - 180 device / 30 detik = 6 req/detik - dan yang dibeli adalah
 * jaminan bahwa kegagalan realtime yang senyap tidak akan pernah membuat
 * keadaan lebih buruk daripada titik awalnya.
 */
export const POLL_TERSAMBUNG_MS = 30_000;

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
    let selesai = false;

    const batalkanJadwal = () => {
      if (!timer) return;
      clearTimeout(timer);
      timer = null;
    };

    const jadwalkan = () => {
      if (selesai || document.visibilityState !== 'visible') return;
      // Sudah ada yang menunggu: event ini ikut terserap ke sana.
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        cb.current();
      }, TUNDA_MS + Math.random() * JITTER_MS);
    };

    const lifecycle = new RealtimeChannelLifecycle<RealtimeChannel>(
      () => {
        const baru = supabase
          .channel('order_adjustments')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'order_adjustments' },
            jadwalkan,
          );
        baru.subscribe((status) => {
          // Callback dari channel yang sudah dilepas tidak boleh mengubah status
          // channel penggantinya.
          if (selesai || !lifecycle.isCurrent(baru)) return;
          const hidup = status === 'SUBSCRIBED';
          setTersambung(hidup);
        });
        return baru;
      },
      (lama) => supabase.removeChannel(lama),
    );

    const sambung = (refresh = false) => {
      if (selesai || document.visibilityState !== 'visible') return;
      // Event selama tab tersembunyi tidak diputar ulang: baca keadaan terbaru
      // segera, tanpa menunggu debounce event Realtime.
      if (refresh) cb.current();
      void lifecycle.setActive(true);
    };

    const putus = () => {
      batalkanJadwal();
      if (!selesai) setTersambung(false);
      void lifecycle.setActive(false);
    };

    const saatVisibilityBerubah = () => {
      if (document.visibilityState === 'visible') sambung(true);
      else putus();
    };

    const saatPageShow = () => sambung(true);
    const saatPageHide = () => putus();

    document.addEventListener('visibilitychange', saatVisibilityBerubah);
    window.addEventListener('pageshow', saatPageShow);
    window.addEventListener('pagehide', saatPageHide);
    sambung();

    return () => {
      selesai = true;
      document.removeEventListener('visibilitychange', saatVisibilityBerubah);
      window.removeEventListener('pageshow', saatPageShow);
      window.removeEventListener('pagehide', saatPageHide);
      batalkanJadwal();
      void lifecycle.stop();
    };
  }, []);

  return { tersambung };
}

/** Selang polling cadangan sesuai status realtime. */
export const selangPolling = (tersambung: boolean) =>
  tersambung ? POLL_TERSAMBUNG_MS : POLL_PUTUS_MS;
