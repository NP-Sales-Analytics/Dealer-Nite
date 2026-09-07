import postgres from 'postgres';

/**
 * Ref project Supabase PRODUKSI. Skrip uji beban menolak jalan kalau
 * DATABASE_URL menunjuk ke sini.
 *
 * Ini bukan sekadar kehati-hatian: uji beban menulis ratusan ribu baris dan
 * menghabiskan koneksi. Menjalankannya ke database yang dipakai malam event
 * bisa merusak data asli dan menjatuhkan aplikasi tepat saat dibutuhkan.
 */
const REF_PRODUKSI = 'gmlnoqghnkkgbgixkpvv';

/** Penanda data uji. Semua baris dummy memakai ini supaya bersih-bersihnya pasti. */
export const TANDA = 'LOADTEST';
export const PREFIX_SAP = 'LT';

export function urlStaging(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum diset.');
  if (url.includes(REF_PRODUKSI) && process.env.IZINKAN_PRODUKSI !== '1') {
    throw new Error(
      `DITOLAK: DATABASE_URL menunjuk project PRODUKSI (${REF_PRODUKSI}).\n` +
        'Uji beban hanya boleh ke database staging. Set DATABASE_URL staging, mis:\n' +
        '  DATABASE_URL="postgresql://...staging..." npm run loadtest:seed',
    );
  }
  if (url.includes(REF_PRODUKSI)) {
    // Sengaja diloloskan lewat IZINKAN_PRODUKSI=1 untuk uji bedah berdampak
    // kecil. Namanya dibuat panjang dan eksplisit supaya mustahil terpicu
    // tanpa sadar; pengaman ini menahan kecelakaan, bukan keputusan sadar.
    console.warn('!! Berjalan di database PRODUKSI (IZINKAN_PRODUKSI=1). Pastikan ini disengaja.');
  }
  return url;
}

export function db(max = 4) {
  return postgres(urlStaging(), { prepare: false, max });
}
