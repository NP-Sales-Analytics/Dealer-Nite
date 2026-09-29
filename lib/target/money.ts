const bulat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const ringkas = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });

export function formatRupiah(value: number): string {
  return `Rp${bulat.format(value)}`;
}

export function formatRupiahRingkas(value: number): string {
  const absolut = Math.abs(value);
  if (absolut >= 1_000_000_000) return `Rp${ringkas.format(value / 1_000_000_000)} M`;
  if (absolut >= 1_000_000) return `Rp${ringkas.format(value / 1_000_000)} jt`;
  return formatRupiah(value);
}
