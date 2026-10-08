export type JumlahKupon = { pink: number; hijau: number };
export type StatusKupon = 'belum_verifikasi' | 'perlu_dibuat' | 'siap_diberikan' | 'selesai';

/**
 * Nilai target per satu kupon. `pink` adalah slot kupon bernilai besar dan
 * `hijau` slot bernilai kecil; nama slot tetap pink/hijau di data, labelnya
 * mengikuti skema warna DN (lihat NAMA_KUPON).
 */
export type NilaiKupon = { pink: number; hijau: number };
export const NILAI_KUPON_BAWAAN: NilaiKupon = { pink: 100_000_000, hijau: 25_000_000 };

/** Warna fisik kupon per DN. Indonesia Timur memakai putih/kuning. */
export type SkemaKupon = 'pink_hijau' | 'putih_kuning';
export const NAMA_KUPON: Record<SkemaKupon, { pink: string; hijau: string }> = {
  pink_hijau: { pink: 'Pink', hijau: 'Hijau' },
  putih_kuning: { pink: 'Putih', hijau: 'Kuning' },
};

/** Konfigurasi kupon satu DN, dikirim API bersama data kupon. */
export type KonfigKupon = { skema: SkemaKupon; nilai: NilaiKupon };
export const KONFIG_KUPON_BAWAAN: KonfigKupon = { skema: 'pink_hijau', nilai: NILAI_KUPON_BAWAAN };

export const KUPON_NOL: JumlahKupon = { pink: 0, hijau: 0 };
export const totalKupon = (k: JumlahKupon) => k.pink + k.hijau;

/**
 * Hak kupon undian dari Target DN. Keduanya dihitung dari target penuh, jadi
 * dengan nilai bawaan target Rp100 juta = 1 pink DAN 4 hijau; dengan pembagi
 * pink Rp75 juta, target Rp75 juta = 1 pink dan 3 hijau.
 */
export function hitungKupon(target: number, nilai: NilaiKupon = NILAI_KUPON_BAWAAN): JumlahKupon {
  return {
    pink: Math.max(0, Math.floor(target / nilai.pink)),
    hijau: Math.max(0, Math.floor(target / nilai.hijau)),
  };
}

const sisa = (a: JumlahKupon, b: JumlahKupon): JumlahKupon => ({
  pink: Math.max(0, a.pink - b.pink),
  hijau: Math.max(0, a.hijau - b.hijau),
});

/**
 * Posisi kupon satu toko: hak (dari target terverifikasi terakhir) -> dibuat ->
 * diberikan. Kenaikan target setelah kupon dibuat otomatis muncul sebagai
 * "perlu dibuat"; penurunan target (atau pembagi yang dinaikkan) tidak menarik
 * kupon yang sudah dibuat, selisihnya tercatat sebagai kelebihan.
 */
export function prosesKupon({ verified, target, dibuat, diberikan, nilai = NILAI_KUPON_BAWAAN }: {
  verified: boolean;
  target: number;
  dibuat: JumlahKupon;
  diberikan: JumlahKupon;
  nilai?: NilaiKupon;
}) {
  const hak = verified ? hitungKupon(target, nilai) : KUPON_NOL;
  const perluDibuat = sisa(hak, dibuat);
  const siapDiberikan = sisa(dibuat, diberikan);
  const status: StatusKupon = !verified ? 'belum_verifikasi'
    : totalKupon(perluDibuat) > 0 ? 'perlu_dibuat'
      : totalKupon(siapDiberikan) > 0 ? 'siap_diberikan'
        : 'selesai';
  return { hak, dibuat, diberikan, perluDibuat, siapDiberikan, kelebihan: sisa(dibuat, hak), status };
}
