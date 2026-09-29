'use client';

import type { DealerNightOption } from './types';

export function DealerNightSelect({
  options,
  value,
  onChange,
  fixed,
}: {
  options: DealerNightOption[];
  value: string;
  onChange: (value: string) => void;
  fixed: boolean;
}) {
  const selected = options.find((item) => item.id === value);
  if (fixed) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">Dealer Night</p>
        <p className="font-semibold">{selected?.name ?? 'Belum ditentukan'}</p>
      </div>
    );
  }

  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">Dealer Night</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 min-w-56 rounded-xl border border-border bg-card px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
  );
}
