'use client';

import { useEffect, useState } from 'react';

/** Sisa waktu menuju tenggat dalam milidetik. null bila tenggat belum diatur. */
export function useSisaWaktu(tenggat: string | null) {
  const [sisa, setSisa] = useState<number | null>(() =>
    tenggat ? Date.parse(tenggat) - Date.now() : null,
  );

  useEffect(() => {
    if (!tenggat) {
      setSisa(null);
      return;
    }
    const hitung = () => setSisa(Date.parse(tenggat) - Date.now());
    hitung();
    const timer = setInterval(hitung, 1000);
    return () => clearInterval(timer);
  }, [tenggat]);

  return sisa;
}

/**
 * Sisa waktu dalam bentuk ringkas. Detik hanya ditampilkan saat sudah di bawah
 * satu jam - kalau masih lama, angka detik yang bergerak justru bikin gelisah.
 */
export function formatSisa(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const jam = Math.floor(total / 3600);
  const menit = Math.floor((total % 3600) / 60);
  const detik = total % 60;
  if (jam > 0) return `${jam}j ${menit}m`;
  if (menit > 0) return `${menit}m ${detik}d`;
  return `${detik}d`;
}
