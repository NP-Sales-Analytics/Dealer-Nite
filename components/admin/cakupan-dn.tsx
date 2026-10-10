import type { DealerNightOption, UserRow } from './user-form-dialog';
import { cakupanDnAkun } from '@/lib/access';

const MAKS_DN = 2;

/** Cakupan DN saja (tanpa depot), dipotong agar tidak memanjang; daftar lengkap di title. */
export function CakupanDn({ user, options }: { user: UserRow; options: DealerNightOption[] }) {
  const cakupan = cakupanDnAkun(user, options);
  if ('semua' in cakupan) return <span className="truncate">{cakupan.semua}</span>;
  const { nama } = cakupan;
  return (
    <span className="flex min-w-0 items-center gap-1.5" title={nama.join(', ')}>
      <span className="min-w-0 truncate">{nama.slice(0, MAKS_DN).join(', ')}</span>
      {nama.length > MAKS_DN && (
        <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-secondary-foreground">
          +{nama.length - MAKS_DN}
        </span>
      )}
    </span>
  );
}
