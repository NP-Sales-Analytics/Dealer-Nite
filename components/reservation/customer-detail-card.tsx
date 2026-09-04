import type { CustomerSearchResult } from './search-bar';
import { InitialAvatar } from '@/components/shared/initial-avatar';
import { Badge } from '@/components/ui/badge';

const Row = ({ label, value }: { label: string; value: string | number | null }) => (
  <div className="flex items-start justify-between gap-4 py-2 text-sm">
    <span className="shrink-0 text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value ?? '-'}</span>
  </div>
);

export function CustomerDetailCard({ customer }: { customer: CustomerSearchResult }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-start gap-3">
        <InitialAvatar nama={customer.namaToko} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold leading-snug">{customer.namaToko}</h2>
            {customer.sudahHadir && <Badge variant="secondary">Sudah dicatat</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{customer.kodeSap}</p>
        </div>
      </div>

      <div className="divide-y divide-border border-t border-border">
        <Row label="Depot" value={customer.depot} />
        <Row label="Wilayah / Region" value={`${customer.wilayah ?? '-'} / ${customer.region ?? '-'}`} />
        <Row label="Pemilik yang datang" value={customer.namaPemilik || '-'} />
        <Row label="Jumlah diundang" value={`${customer.qtyUndangan} orang`} />
        {customer.sudahHadir && (
          <Row label="Sudah tercatat hadir" value={`${customer.qtyHadirSebelumnya} orang`} />
        )}
      </div>
    </div>
  );
}
