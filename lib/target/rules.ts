/** Target minimal bawaan DN; tiap DN bisa mengubahnya di Setting Target DN. */
export const MIN_TARGET_DN = 50_000_000;
/** Batas bawah untuk target minimal (dan target toko mana pun), sama dengan cek di DB. */
export const BATAS_BAWAH_TARGET = 1_000_000;

const rupiah = (n: number) => `Rp${n.toLocaleString('id-ID')}`;
/** Petunjuk di bawah kolom isian, mis. "Minimal Rp50.000.000." */
export const teksMinimal = (min: number) => `Minimal ${rupiah(min)}.`;
export const pesanTargetMinimal = (min: number) => `Target DN minimal ${rupiah(min)}.`;

export function validateTargetDn(value: number, min = MIN_TARGET_DN): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error('Target DN harus berupa bilangan bulat aman dalam rupiah.');
  }
  if (value < min) {
    throw new Error(pesanTargetMinimal(min));
  }
  return value;
}
