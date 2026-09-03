'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Panggil onChange setiap ada insert di order_adjustments. Payload diabaikan:
 * ini cuma sinyal "ambil ulang", karena leaderboard/total dihitung di server.
 * Polling di komponen tetap jadi cadangan bila koneksi realtime putus (spec 6).
 */
export function useRealtimeRefresh(onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('order_adjustments')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_adjustments' }, () => cb.current())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
