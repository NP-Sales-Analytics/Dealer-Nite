import { formatRupiah } from '@/lib/target/money';
import { validateTargetDn } from '@/lib/target/rules';

export function parseRupiahInput(value: string): number {
  const digits = value.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : Number.NaN;
}

export function buildTargetAdjustment(customerId: string, value: string) {
  const newTarget = validateTargetDn(parseRupiahInput(value));
  return { customerId, newTarget };
}

export function targetFormCopy({ currentTarget, verified = true }: { currentTarget: number; verified?: boolean }) {
  return verified ? {
    title: 'Penyesuaian Target DN',
    current: `Target saat ini ${formatRupiah(currentTarget)}`,
    instruction: 'Masukkan nominal target akhir yang baru.',
    save: 'Simpan Penyesuaian',
  } : {
    title: 'Verifikasi Target DN',
    current: `Target dari pusat ${formatRupiah(currentTarget)}`,
    instruction: 'Cek kesesuaian target dari pusat',
    save: 'Simpan Verifikasi',
  };
}
