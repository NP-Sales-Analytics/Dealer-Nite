import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Identitas visual, satu tempat untuk sidebar dan halaman no-access.
 * Halaman login memakai logo penuh (logo-nippon-full.png) langsung.
 */
export function Brand({
  className,
  subtitle = 'Launching Pylox Premium',
  size = 'md',
}: {
  className?: string;
  subtitle?: string | null;
  size?: 'md' | 'lg';
}) {
  const sisi = size === 'lg' ? 44 : 36;

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <Image
        src="/logo-nippon.png"
        alt="Nippon Paint"
        width={sisi}
        height={sisi}
        priority
        className="shrink-0 rounded-lg"
      />
      <span className="min-w-0">
        <span
          className={cn(
            'block truncate font-semibold leading-tight text-foreground',
            size === 'lg' ? 'text-xl' : 'text-base',
          )}
        >
          Nippon
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
