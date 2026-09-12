import { describe, expect, it } from 'vitest';
import { periksaPenambahan, pesanGagal, MAKS_SEKALI, MAKS_TOTAL } from '@/lib/order/aturan';
import { orderAdjustSchema, orderCustomerPatchSchema } from '@/lib/validations/order';

const T0 = Date.parse('2026-09-05T12:00:00+07:00');
const dasar = { totalBaru: 150, dusAwal: 120, tenggat: null, sekarang: T0 };

describe('periksaPenambahan', () => {
  it('meloloskan angka di atas pengambilan pertama', () => {
    expect(periksaPenambahan(dasar)).toBeNull();
  });

  it('meloloskan angka yang sama persis dengan pengambilan pertama', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: 120 })).toBeNull();
  });

  it('menolak angka di bawah pengambilan pertama', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: 119 })).toBe('DI_BAWAH_AWAL');
  });

  it('toko yang belum pernah mengambil belum punya lantai', () => {
    expect(periksaPenambahan({ ...dasar, dusAwal: null, totalBaru: 1 })).toBeNull();
  });

  it('total minus tetap ditolak', () => {
    expect(periksaPenambahan({ ...dasar, dusAwal: null, totalBaru: -1 })).toBe('NEGATIVE');
  });

  it('tenggat yang sudah lewat mengunci semuanya', () => {
    const tenggat = new Date(T0 - 1000).toISOString();
    expect(periksaPenambahan({ ...dasar, tenggat })).toBe('TENGGAT_HABIS');
  });

  it('tenggat diperiksa lebih dulu daripada batas bawah', () => {
    const tenggat = new Date(T0 - 1000).toISOString();
    expect(periksaPenambahan({ ...dasar, tenggat, totalBaru: 10 })).toBe('TENGGAT_HABIS');
  });

  it('tenggat yang belum lewat tidak menghalangi', () => {
    const tenggat = new Date(T0 + 60_000).toISOString();
    expect(periksaPenambahan({ ...dasar, tenggat })).toBeNull();
  });

  it('tepat pada detik tenggat sudah dianggap habis', () => {
    expect(periksaPenambahan({ ...dasar, tenggat: new Date(T0).toISOString() })).toBe('TENGGAT_HABIS');
  });
});

// Batas SEKALI simpan, bukan batas total. Total boleh berapa pun - inilah
// pembeda yang paling gampang salah dipahami saat kode ini disentuh lagi.
describe('MAKS_SEKALI', () => {
  const dasar = { dusAwal: null, tenggat: null };

  it('menolak lompatan di atas batas sekali simpan', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: 10_001, selisih: 10_001 }))
      .toBe('SEKALI_TERLALU_BANYAK');
  });

  it('tepat di batas masih boleh', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: MAKS_SEKALI, selisih: MAKS_SEKALI }))
      .toBeNull();
  });

  it('TOTAL besar tetap boleh selama lompatannya kecil', () => {
    // 50.000 dus bukan masalah; yang dijaga cuma cara sampainya.
    expect(periksaPenambahan({ ...dasar, totalBaru: 50_000, selisih: 500 })).toBeNull();
  });

  it('pengurangan besar ikut ditolak - salah ketik bisa dua arah', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: 5_000, selisih: -20_000 }))
      .toBe('SEKALI_TERLALU_BANYAK');
  });

  it('tanpa selisih, batas ini tidak berlaku - koreksi admin bebas', () => {
    expect(periksaPenambahan({ ...dasar, totalBaru: 999_999 })).toBeNull();
  });
});

/**
 * Celah yang meloloskan bug "+2000 gagal tanpa penjelasan": skema server
 * menolak di 1.000 sementara layar menjanjikan 10.000, dan tidak ada satu tes
 * pun yang memeriksa keduanya sepakat. Aturan boleh berubah - yang tidak boleh
 * adalah dua lapisan memakai angka berbeda diam-diam.
 */
describe('skema server sepakat dengan aturan yang ditampilkan', () => {
  const adjust = (qtyChange: number) => orderAdjustSchema.safeParse({ qtyChange }).success;

  it('menerima lompatan tepat sebesar MAKS_SEKALI, dua arah', () => {
    expect(adjust(MAKS_SEKALI)).toBe(true);
    expect(adjust(-MAKS_SEKALI)).toBe(true);
  });

  it('menolak lompatan satu langkah di atas MAKS_SEKALI, dua arah', () => {
    expect(adjust(MAKS_SEKALI + 1)).toBe(false);
    expect(adjust(-MAKS_SEKALI - 1)).toBe(false);
  });

  it('menerima angka yang lolos pemeriksaan klien - kasus yang dulu gagal', () => {
    expect(adjust(2_000)).toBe(true);
  });

  it('nol tetap ditolak: menyimpan tanpa perubahan tidak berarti apa-apa', () => {
    expect(adjust(0)).toBe(false);
  });

  it('koreksi admin menerima MAKS_TOTAL dan menolak di atasnya', () => {
    expect(orderCustomerPatchSchema.safeParse({ total: MAKS_TOTAL }).success).toBe(true);
    expect(orderCustomerPatchSchema.safeParse({ total: MAKS_TOTAL + 1 }).success).toBe(false);
  });
});

describe('pesanGagal', () => {
  const GENERIK = 'Koneksi bermasalah. Coba lagi.';

  it('memakai pesan aturan untuk penolakan 409', () => {
    expect(pesanGagal(409, { code: 'DI_BAWAH_AWAL' })).toContain('pengambilan pertama');
    expect(pesanGagal(409, { code: 'TENGGAT_HABIS' })).toContain('habis');
  });

  it('penolakan region akhirnya punya kalimatnya sendiri', () => {
    expect(pesanGagal(403, { code: 'LUAR_REGION' })).toContain('region');
  });

  it('menyebut batas sekali simpan saat skema menolak', () => {
    expect(pesanGagal(400, { code: 'INVALID' })).toContain(MAKS_SEKALI.toLocaleString('id-ID'));
  });

  // Inti perbaikannya: tidak ada lagi kegagalan yang sampai ke user tanpa sebab.
  it('tidak pernah jatuh ke kalimat generik untuk status yang dikenal', () => {
    for (const status of [400, 401, 403, 404, 429]) {
      expect(pesanGagal(status, null)).not.toBe(GENERIK);
    }
  });

  it('jaringan putus dan galat server memang generik - sebabnya tidak diketahui', () => {
    expect(pesanGagal(0, null)).toBe(GENERIK);
    expect(pesanGagal(500, null)).toBe(GENERIK);
  });
});
