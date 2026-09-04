import { cn, inisial } from '@/lib/utils';

/**
 * Label dua huruf dari nama toko. Bentuknya disamakan dengan tabel Detail Toko
 * Hadir dan User Management supaya satu identitas visual di seluruh aplikasi.
 */
export function InitialAvatar({ nama, className }: { nama: string; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground',
        className,
      )}
      aria-hidden
    >
      {inisial(nama)}
    </span>
  );
}
