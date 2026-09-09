'use client';

import { Combobox } from '@base-ui/react/combobox';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dropdown dengan kotak pencarian di dalamnya - dua varian, satu dan banyak
 * pilihan.
 *
 * Dipakai untuk daftar panjang yang mustahil dipindai dengan mata: 97 depot di
 * filter, dan depot pada Tamu Manual yang dulu berupa ketikan bebas. Mengetik
 * bebas di sana adalah sumber salah input yang paling mahal - satu huruf beda
 * membuat depot itu jadi entri baru yang tidak pernah cocok dengan filter mana
 * pun, dan baru ketahuan saat rekap.
 */

const GAYA_PEMICU =
  'flex h-11 items-center justify-between gap-2 rounded-xl border border-border bg-background px-3.5 text-sm ' +
  'select-none hover:bg-secondary/50 data-[popup-open]:bg-secondary/50 ' +
  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none';

const GAYA_POPUP =
  'z-50 max-h-[min(24rem,var(--available-height))] w-[max(var(--anchor-width),15rem)] max-w-[var(--available-width)] ' +
  'origin-[var(--transform-origin)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg ' +
  'transition-[transform,opacity] data-starting-style:scale-95 data-starting-style:opacity-0 ' +
  'data-ending-style:scale-95 data-ending-style:opacity-0';

const GAYA_ITEM =
  'grid cursor-default grid-cols-[1rem_1fr] items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none ' +
  'data-highlighted:bg-secondary data-selected:font-medium';

/** Kotak pencarian + daftar. Sama untuk kedua varian. */
function IsiPopup({
  placeholder,
  kosong,
  format,
}: {
  placeholder: string;
  kosong: string;
  format?: (v: string) => string;
}) {
  return (
    <Combobox.Portal>
      <Combobox.Positioner align="start" sideOffset={6} className="z-50">
        <Combobox.Popup className={GAYA_POPUP}>
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Combobox.Input
              placeholder={placeholder}
              className="h-11 w-full bg-transparent pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <Combobox.Empty>
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{kosong}</p>
          </Combobox.Empty>

          <Combobox.List className="max-h-72 overflow-y-auto overscroll-contain p-1.5 empty:p-0">
            {(item: string) => (
              <Combobox.Item key={item} value={item} className={GAYA_ITEM}>
                <Combobox.ItemIndicator className="col-start-1 text-primary">
                  <Check className="size-4" />
                </Combobox.ItemIndicator>
                <span className="col-start-2 break-words">{format ? format(item) : item}</span>
              </Combobox.Item>
            )}
          </Combobox.List>
        </Combobox.Popup>
      </Combobox.Positioner>
    </Combobox.Portal>
  );
}

/** Satu pilihan. Nilai kosong berarti belum dipilih. */
export function PilihSatu({
  items,
  value,
  onChange,
  placeholder,
  cariPlaceholder = 'Ketik untuk mencari...',
  kosong = 'Tidak ada yang cocok.',
  id,
  className,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  cariPlaceholder?: string;
  kosong?: string;
  id?: string;
  className?: string;
}) {
  return (
    <Combobox.Root
      items={items}
      value={value || null}
      onValueChange={(v) => onChange((v as string | null) ?? '')}
    >
      <Combobox.Trigger id={id} className={cn(GAYA_PEMICU, 'w-full', className)}>
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {value || placeholder}
        </span>
        <Combobox.Icon className="shrink-0 text-muted-foreground">
          <ChevronDown className="size-4" />
        </Combobox.Icon>
      </Combobox.Trigger>
      <IsiPopup placeholder={cariPlaceholder} kosong={kosong} />
    </Combobox.Root>
  );
}

/**
 * Banyak pilihan sekaligus.
 *
 * Pemicunya sengaja meringkas ("3 Depot dipilih") alih-alih menampilkan chip
 * satu per satu: di bilah filter, chip yang menumpuk membuat tingginya berubah
 * tiap kali orang memilih, dan tata letak yang melompat-lompat justru
 * mengganggu saat sedang menyaring.
 */
export function PilihBanyak({
  items,
  value,
  onChange,
  labelSemua,
  satuan,
  cariPlaceholder = 'Ketik untuk mencari...',
  kosong = 'Tidak ada yang cocok.',
  format,
  className,
}: {
  items: string[];
  value: string[];
  onChange: (v: string[]) => void;
  /** Tulisan saat belum ada yang dipilih, mis. "Semua Region". */
  labelSemua: string;
  /** Kata untuk ringkasan jamak, mis. "Region" -> "3 Region dipilih". */
  satuan: string;
  cariPlaceholder?: string;
  kosong?: string;
  format?: (v: string) => string;
  className?: string;
}) {
  const ringkas =
    value.length === 0
      ? labelSemua
      : value.length === 1
        ? (format ? format(value[0]) : value[0])
        : `${value.length} ${satuan} dipilih`;

  return (
    <Combobox.Root
      multiple
      items={items}
      value={value}
      onValueChange={(v) => onChange(v as string[])}
    >
      <Combobox.Trigger
        aria-label={labelSemua}
        className={cn(GAYA_PEMICU, value.length > 0 && 'border-primary/40 bg-primary/5', className)}
      >
        <span className={cn('truncate', value.length === 0 && 'text-muted-foreground')}>
          {ringkas}
        </span>
        <Combobox.Icon className="shrink-0 text-muted-foreground">
          <ChevronDown className="size-4" />
        </Combobox.Icon>
      </Combobox.Trigger>
      <IsiPopup placeholder={cariPlaceholder} kosong={kosong} format={format} />
    </Combobox.Root>
  );
}
