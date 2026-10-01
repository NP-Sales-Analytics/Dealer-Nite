'use client';

import { PilihSatu } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import type { DealerNightOption } from './types';

/** Pemilih Dealer Night untuk baris filter. Satu pilihan saja = label statis. */
export function DealerNightSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: DealerNightOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const nama = (id: string) => options.find((item) => item.id === id)?.name ?? id;

  if (options.length <= 1) {
    return (
      <div className={cn('flex h-11 items-center rounded-xl border border-border bg-secondary/40 px-3.5 text-sm font-medium', className)}>
        <span className="truncate">{options[0]?.name ?? 'Belum ada Dealer Night'}</span>
      </div>
    );
  }

  return (
    <PilihSatu
      items={options.map((item) => item.id)}
      value={value}
      onChange={(id) => id && onChange(id)}
      format={nama}
      placeholder="Pilih Dealer Night"
      cariPlaceholder="Cari Dealer Night..."
      kosong="Dealer Night tidak ditemukan."
      className={cn('border-primary font-medium', className)}
    />
  );
}
