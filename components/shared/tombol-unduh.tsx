'use client';

import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Tombol unduh berkas Excel untuk halaman data operasional.
 *
 * Mengunduh lewat fetch, BUKAN <a download> biasa. Berkasnya butuh cookie sesi
 * dan bisa ditolak server (sesi habis, atau izin unduh dicabut); dengan <a>
 * kegagalan itu berakhir jadi tab kosong atau berkas rusak yang baru ketahuan
 * saat dibuka. Lewat fetch, gagalnya kelihatan sebagai pesan.
 *
 * Pemanggilnya sudah menyembunyikan tombol ini bila tidak berizin, tapi
 * route-nya tetap memeriksa sendiri - yang di sini hanya kenyamanan.
 */
export function TombolUnduh({
  url,
  namaBawaan,
  jumlah,
  label = 'Download Excel',
  pesanSukses,
  className,
}: {
  /** Termasuk query string filter, supaya yang terunduh sama dengan yang terlihat. */
  url: string;
  namaBawaan: string;
  /** Dipakai untuk mematikan tombol saat kosong, dan pesan sukses bawaan. */
  jumlah: number;
  label?: string;
  /**
   * Override pesan sukses saat "N baris" tidak berarti apa-apa - dipakai
   * unduhan yang cakupannya bukan daftar terfilter yang sedang terlihat
   * (mis. audit lintas region), jadi jumlah barisnya tidak diketahui klien
   * tanpa query tambahan yang percuma.
   */
  pesanSukses?: string;
  className?: string;
}) {
  const [mengunduh, setMengunduh] = useState(false);

  const unduh = async () => {
    setMengunduh(true);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        toast.error(
          res.status === 403
            ? 'Akun Anda tidak punya izin mengunduh data.'
            : 'Gagal mengunduh. Coba lagi.',
        );
        return;
      }

      const blob = await res.blob();
      const nama =
        res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ?? namaBawaan;

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = nama;
      a.click();
      URL.revokeObjectURL(objectUrl);
      toast.success(pesanSukses ?? `${jumlah} baris diunduh.`);
    } catch {
      toast.error('Koneksi bermasalah. Coba lagi.');
    } finally {
      setMengunduh(false);
    }
  };

  return (
    <Button
      variant="outline"
      className={cn(className)}
      onClick={unduh}
      disabled={mengunduh || jumlah === 0}
      title={jumlah === 0 ? 'Belum ada data untuk diunduh' : 'Unduh sebagai Excel'}
    >
      <Download className="size-4" />
      {mengunduh ? 'Menyiapkan...' : label}
    </Button>
  );
}
