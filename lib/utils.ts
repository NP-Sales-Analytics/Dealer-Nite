import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Inisial dari sebuah nama, maksimal dua huruf.
 *
 * Prefiks badan usaha dibuang lebih dulu supaya inisialnya mewakili nama
 * tokonya, bukan "PT" atau "CV" yang sama untuk ratusan baris.
 */
export function inisial(nama: string) {
  return (
    nama
      .replace(/^(PT|CV)[.\s]+/i, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || '?'
  );
}

/** Jam check-in dalam zona Asia/Jakarta. */
export function jamJakarta(v: string) {
  // checked_in_at datang sebagai string mentah driver ("2026-09-02 06:15:05.88+00").
  // JANGAN ubah spasi jadi "T": offset "+00" tanpa menit bukan ISO valid, dan
  // parser jadi strict lalu mengembalikan Invalid Date. Bentuk aslinya diterima.
  return new Date(v).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });
}

/** Tanggal lengkap check-in, dipakai di panel detail. */
export function tanggalJakarta(v: string) {
  return new Date(v).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}
