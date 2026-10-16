/**
 * Pencarian teks di daftar halaman: cocok bila salah satu kolom teks memuat kata
 * kunci, atau kata kunci berupa angka yang sama persis dengan salah satu
 * No. Formulir (persis, supaya "8" tidak ikut menemukan Form 18 dan 88).
 */
export function cocokCari(q: string, teks: (string | null | undefined)[], formulir: number[] = []): boolean {
  const kunci = q.trim().toLowerCase();
  if (!kunci) return true;
  return teks.some((item) => !!item && item.toLowerCase().includes(kunci))
    || (/^\d+$/.test(kunci) && formulir.includes(Number(kunci)));
}
