/** Alasan sebuah penambahan ditolak. null berarti boleh disimpan. */
export type Tolakan = 'TENGGAT_HABIS' | 'NEGATIVE' | 'DI_BAWAH_AWAL' | 'SEKALI_TERLALU_BANYAK' | null;

/**
 * Batas SATU KALI penambahan, bukan batas total.
 *
 * Sebuah toko boleh saja mencapai 50.000 dus - tidak ada plafon di sana. Yang
 * dibatasi hanyalah lompatan dalam sekali simpan, dan alasannya salah ketik:
 * satu nol kelebihan mengubah 1.500 jadi 15.000, dan di ledger yang bersifat
 * tambah-terus koreksinya jauh lebih repot daripada mencegahnya. Yang butuh
 * lebih tinggal menyimpan beberapa kali.
 */
export const MAKS_SEKALI = 10_000;

/**
 * Plafon ANGKA TOTAL untuk koreksi admin lewat Detail Order.
 *
 * Beda peran dengan MAKS_SEKALI: yang ini membatasi nilai akhirnya, bukan
 * lompatannya, dan hanya berlaku pada jalur koreksi absolut. Sifatnya
 * pagar salah ketik juga - bukan target bisnis - tapi harus tetap disebut
 * di layar, karena batas yang tidak pernah ditampilkan cuma jadi kegagalan
 * yang tak bisa dijelaskan.
 */
export const MAKS_TOTAL = 100_000;

/**
 * Satu-satunya tempat aturan penambahan order diputuskan, dipakai server
 * (/api/order/adjust) sebagai gerbang dan klien sebagai penjelasan.
 *
 * Urutannya disengaja: tenggat diperiksa lebih dulu karena ia mengunci semuanya,
 * baru batas bawah. dusAwal adalah pengambilan pertama yang tercatat - begitu
 * ada, angka tidak boleh turun di bawahnya lagi (lihat 0007_detail_order.sql).
 *
 * selisih hanya diperiksa bila diberikan. Koreksi admin lewat Detail Order
 * menetapkan total secara absolut dan SENGAJA tidak tunduk pada MAKS_SEKALI -
 * batas itu untuk mencegah salah ketik saat menambah, bukan untuk membatasi
 * otoritas admin yang sedang membetulkan angka.
 */
export function periksaPenambahan({
  totalBaru,
  dusAwal,
  tenggat,
  selisih,
  sekarang = Date.now(),
}: {
  totalBaru: number;
  dusAwal: number | null;
  tenggat: string | null;
  /** Lompatan sekali simpan. Diisi hanya oleh jalur penambahan. */
  selisih?: number;
  sekarang?: number;
}): Tolakan {
  if (tenggat && Date.parse(tenggat) <= sekarang) return 'TENGGAT_HABIS';
  if (totalBaru < 0) return 'NEGATIVE';
  if (dusAwal !== null && totalBaru < dusAwal) return 'DI_BAWAH_AWAL';
  if (selisih !== undefined && Math.abs(selisih) > MAKS_SEKALI) return 'SEKALI_TERLALU_BANYAK';
  return null;
}

/** Pesan siap tampil untuk tiap penolakan. */
export const PESAN_TOLAKAN: Record<NonNullable<Tolakan>, string> = {
  TENGGAT_HABIS: 'Waktu penambahan sudah habis.',
  NEGATIVE: 'Total tidak boleh kurang dari 0.',
  DI_BAWAH_AWAL: 'Tidak boleh kurang dari pengambilan pertama.',
  SEKALI_TERLALU_BANYAK: `Sekali simpan maksimal ${MAKS_SEKALI.toLocaleString('id-ID')} dus. Silakan simpan bertahap.`,
};

/**
 * Tinggal di sini, bukan di lib/order/akses.ts, supaya klien bisa membacanya.
 * akses.ts menarik lib/auth beserta seluruh isinya; aturan.ts tidak menarik
 * apa pun, jadi inilah satu-satunya tempat pesan aturan boleh berkumpul.
 * akses.ts meneruskannya kembali agar pemanggil server tidak perlu berubah.
 */
export const PESAN_LUAR_REGION = 'Toko ini di luar region Anda.';

/**
 * Kode penolakan yang punya kalimatnya sendiri - bukan cuma yang dari
 * periksaPenambahan. Yang tidak ada di sini jatuh ke PESAN_STATUS.
 */
const PESAN_KODE: Record<string, string> = {
  ...PESAN_TOLAKAN,
  LUAR_REGION: PESAN_LUAR_REGION,
  NOT_FOUND: 'Data toko tidak ditemukan. Silakan hubungi panitia.',
  DEPOT_INVALID: 'Depot itu tidak ada dalam daftar. Pilih salah satu dari pilihan yang tersedia.',
  INVALID:
    `Jumlahnya belum bisa disimpan. Sekali simpan maksimal ` +
    `${MAKS_SEKALI.toLocaleString('id-ID')} dus dan tidak boleh nol.`,
};

/** Cadangan per status HTTP, untuk kegagalan yang tidak membawa kode. */
const PESAN_STATUS: Record<number, string> = {
  400: PESAN_KODE.INVALID,
  401: 'Sesi Anda sudah berakhir. Silakan masuk lagi.',
  403: 'Anda tidak berhak mengubah order toko ini.',
  404: PESAN_KODE.NOT_FOUND,
  429: 'Terlalu cepat. Tunggu sebentar, lalu coba lagi.',
};

/**
 * Satu penerjemah kegagalan untuk SEMUA layar order.
 *
 * Ada karena sebaliknya sudah terbukti gagal: tiap layar punya salinan
 * penangan error sendiri yang hanya mengenali penolakan 409, sehingga enam
 * dari tujuh jenis kegagalan - termasuk lompatan yang melewati batas - sampai
 * ke user sebagai "Gagal menyimpan. Coba lagi.". Kalimat yang tidak menyebutkan
 * apa yang salah membuat orang mencoba ulang hal yang sama sampai menyerah.
 *
 * status 0 berarti request tidak pernah sampai (jaringan putus).
 */
export function pesanGagal(status: number, data?: unknown): string {
  const kode = (data as { code?: string } | null | undefined)?.code;
  if (kode && kode in PESAN_KODE) return PESAN_KODE[kode];
  if (status in PESAN_STATUS) return PESAN_STATUS[status];
  return 'Koneksi bermasalah. Coba lagi.';
}
