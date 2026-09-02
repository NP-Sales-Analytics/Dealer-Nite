import type { CustomerSearchResult } from './search-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Row = ({ label, value }: { label: string; value: string | number | null }) => (
  <div className="flex justify-between gap-4 py-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium">{value ?? '-'}</span>
  </div>
);

export function CustomerDetailCard({ customer }: { customer: CustomerSearchResult }) {
  return (
    <Card>
      <CardHeader><CardTitle>{customer.namaToko}</CardTitle></CardHeader>
      <CardContent className="divide-y">
        <Row label="Kode SAP" value={customer.kodeSap} />
        <Row label="Depot" value={customer.depot} />
        <Row label="Wilayah / Region" value={`${customer.wilayah ?? '-'} / ${customer.region ?? '-'}`} />
        <Row label="Pemilik yang datang" value={customer.namaPemilik || '-'} />
        <Row label="Jumlah diundang" value={`${customer.qtyUndangan} orang`} />
        {customer.sudahHadir && (
          <Row label="Sudah tercatat hadir" value={`${customer.qtyHadirSebelumnya} orang`} />
        )}
      </CardContent>
    </Card>
  );
}
