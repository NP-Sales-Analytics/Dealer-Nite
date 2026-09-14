/**
 * Sel dan pemformatan bersama untuk semua ekspor Excel (write-excel-file).
 *
 * Sebelumnya disalin persis di tiap route export (kehadiran, order, dan
 * sekarang riwayat penyesuaian) - begitu ada yang ketiga, penyalinan itu
 * jadi tiga sumber kebenaran untuk satu keputusan format yang sama.
 */

/**
 * Waktu ditulis sebagai TEKS ber-zona Jakarta, bukan tanggal Excel.
 *
 * Excel menyimpan tanggal tanpa zona waktu, sedangkan fungsi ini berjalan di
 * server yang zonanya UTC. Menuliskannya sebagai tanggal berarti menyerahkan
 * penafsiran zona ke Excel di komputer yang membukanya - dan satu jam yang
 * bergeser di rekap acara jauh lebih merepotkan daripada kehilangan
 * kemampuan mengurutkan lewat kolom. Urutan kronologisnya sendiri tidak hilang
 * kalau barisnya memang sudah diurutkan dari query.
 */
export const waktuWib = (v: string | null) =>
  v === null
    ? ''
    : new Date(v)
        .toLocaleString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        })
        // id-ID menyisipkan koma antara tanggal dan jam, dan memakai titik
        // sebagai pemisah jam-menit. Dirapikan jadi "08/09/2026 15:15".
        .replace(',', '')
        .replace(/\./g, ':');

/** Header ditebalkan dan diberi latar supaya tidak hilang saat digulir. */
export const header = (teksJudul: string) => ({
  value: teksJudul,
  fontWeight: 'bold' as const,
  backgroundColor: '#EEF2FF',
  align: 'center' as const,
});

export const teks = (v: string | null) => ({ value: v ?? '' });

export const angka = (v: number | null | undefined) => ({
  value: v ?? undefined,
  type: Number,
  align: 'center' as const,
});
