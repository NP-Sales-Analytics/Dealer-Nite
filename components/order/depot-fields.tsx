'use client';

import { PilihSatu } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PilihanDepot } from '@/lib/dashboard/hierarchy';

/** Dropdown depot tunggal + metadata induk yang selalu mengikuti CSV hierarki. */
export function DepotFields({
  idPrefix,
  depot,
  options,
  onDepotChange,
  fieldName,
}: {
  idPrefix: string;
  depot: string;
  options: PilihanDepot[];
  onDepotChange: (depot: string) => void;
  /** Diisi pada form tambah yang dikirim sebagai FormData. */
  fieldName?: string;
}) {
  const terpilih = options.find((item) => item.depot === depot);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-depot`}>Depot</Label>
        <PilihSatu
          id={`${idPrefix}-depot`}
          items={options.map((item) => item.depot)}
          value={depot}
          onChange={onDepotChange}
          placeholder="Pilih depot"
          cariPlaceholder="Cari depot..."
          kosong="Depot tidak ditemukan."
        />
        {fieldName && <input type="hidden" name={fieldName} value={depot} />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-region`}>Region</Label>
          <Input
            id={`${idPrefix}-region`}
            value={terpilih?.region ?? ''}
            placeholder="Terisi otomatis"
            readOnly
            aria-readonly="true"
            className="h-11 bg-secondary/40"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-wilayah`}>Wilayah</Label>
          <Input
            id={`${idPrefix}-wilayah`}
            value={terpilih?.wilayah ?? ''}
            placeholder="Terisi otomatis"
            readOnly
            aria-readonly="true"
            className="h-11 bg-secondary/40"
          />
        </div>
      </div>
    </div>
  );
}

