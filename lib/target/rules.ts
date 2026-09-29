export const MIN_TARGET_DN = 50_000_000;

export function validateTargetDn(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error('Target DN harus berupa bilangan bulat aman dalam rupiah.');
  }
  if (value < MIN_TARGET_DN) {
    throw new Error('Target DN minimal Rp50.000.000.');
  }
  return value;
}
