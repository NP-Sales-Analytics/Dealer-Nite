export const NILAI_KUPON_PINK = 100_000_000;
export const NILAI_KUPON_HIJAU = 25_000_000;

export type JumlahKupon = { pink: number; hijau: number };
export type StatusKupon = 'belum_verifikasi' | 'perlu_dibuat' | 'siap_diberikan' | 'selesai';

export const KUPON_NOL: JumlahKupon = { pink: 0, hijau: 0 };
export const totalKupon = (k: JumlahKupon) => k.pink + k.hijau;

/**
 * Hak kupon undian dari Target DN. Keduanya dihitung dari target penuh, jadi
 * target Rp100 juta = 1 pink DAN 4 hijau.
 */
export function hitungKupon(target: number): JumlahKupon {
  return {
    pink: Math.max(0, Math.floor(target / NILAI_KUPON_PINK)),
    hijau: Math.max(0, Math.floor(target / NILAI_KUPON_HIJAU)),
  };
}

const sisa = (a: JumlahKupon, b: JumlahKupon): JumlahKupon => ({
  pink: Math.max(0, a.pink - b.pink),
  hijau: Math.max(0, a.hijau - b.hijau),
});

/**
 * Posisi kupon satu toko: hak (dari target terverifikasi terakhir) -> dibuat ->
 * diberikan. Kenaikan target setelah kupon dibuat otomatis muncul sebagai
 * "perlu dibuat"; penurunan target tidak menarik kupon yang sudah dibuat,
 * selisihnya tercatat sebagai kelebihan.
 */
export function prosesKupon({ verified, target, dibuat, diberikan }: {
  verified: boolean;
  target: number;
  dibuat: JumlahKupon;
  diberikan: JumlahKupon;
}) {
  const hak = verified ? hitungKupon(target) : KUPON_NOL;
  const perluDibuat = sisa(hak, dibuat);
  const siapDiberikan = sisa(dibuat, diberikan);
  const status: StatusKupon = !verified ? 'belum_verifikasi'
    : totalKupon(perluDibuat) > 0 ? 'perlu_dibuat'
      : totalKupon(siapDiberikan) > 0 ? 'siap_diberikan'
        : 'selesai';
  return { hak, dibuat, diberikan, perluDibuat, siapDiberikan, kelebihan: sisa(dibuat, hak), status };
}
