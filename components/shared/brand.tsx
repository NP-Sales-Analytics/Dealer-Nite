import { cn } from '@/lib/utils';

/**
 * Satu-satunya tempat identitas visual didefinisikan.
 * Ketika file logo tersedia, ganti blok <span> berikut dengan <Image> di sini saja -
 * sidebar dan halaman login otomatis ikut.
 */
export function Brand({
  className,
  subtitle = 'Penerimaan Tamu',
  size = 'md',
}: {
  className?: string;
  subtitle?: string | null;
  size?: 'md' | 'lg';
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-xl bg-primary font-semibold text-primary-foreground',
          size === 'lg' ? 'size-11 text-lg' : 'size-9 text-base',
        )}
        aria-hidden
      >
        P
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate font-semibold leading-tight text-foreground',
            size === 'lg' ? 'text-xl' : 'text-base',
          )}
        >
          Pylox
        </span>
        {subtitle && (
          <span className="block truncate text-xs leading-tight text-muted-foreground">
            {subtitle}
          </span>
        )}
      </span>
    </div>
  );
}
