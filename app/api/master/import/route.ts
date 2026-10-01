import { NextResponse, type NextRequest } from 'next/server';
import readXlsxFile from 'read-excel-file/node';
import { parse } from 'csv-parse/sync';
import { checkHeaders, parseDealerNightRecords, type DepotByCode } from '@/lib/csv/parse-dealer-night';
import { bersihkanCacheDashboard } from '@/lib/dashboard/cache';
import { depotPerKode } from '@/lib/dashboard/hierarchy';
import { importMaster } from '@/lib/target/master';
import { izinMaster, masterErrorResponse } from '../_auth';

const MAKS_BYTE = 5 * 1024 * 1024;

async function bacaBaris(file: File): Promise<Record<string, unknown>[]> {
  const nama = file.name.toLowerCase();
  if (nama.endsWith('.csv')) {
    const teks = await file.text();
    const [headers = []] = parse(teks, { bom: true, to_line: 1 }) as string[][];
    checkHeaders(headers);
    return parse(teks, { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[];
  }
  if (nama.endsWith('.xlsx')) {
    const rows = await readXlsxFile(Buffer.from(await file.arrayBuffer()));
    const headers = (rows[0] ?? []).map((cell) => String(cell ?? '').trim());
    checkHeaders(headers);
    return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
  }
  throw new Error('Format file harus .csv atau .xlsx.');
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const dealerNightId = String(form.get('dealerNightId') ?? '');
  const file = form.get('file');
  if (!dealerNightId) return NextResponse.json({ error: 'Dealer Night wajib dipilih.' }, { status: 400 });
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'File wajib diunggah.' }, { status: 400 });
  if (file.size > MAKS_BYTE) return NextResponse.json({ error: 'Ukuran file maksimal 5 MB.' }, { status: 400 });

  const user = await izinMaster(dealerNightId);
  if (user instanceof NextResponse) return user;

  let rows;
  try {
    const depots: DepotByCode = new Map([...depotPerKode()].map(([kode, item]) => [kode, {
      depotName: item.depot, wilayah: item.wilayah, region: item.region,
    }]));
    rows = parseDealerNightRecords(await bacaBaris(file), depots);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'File tidak bisa dibaca.' }, { status: 400 });
  }

  try {
    const hasil = await importMaster(dealerNightId, rows);
    bersihkanCacheDashboard();
    return NextResponse.json(hasil);
  } catch (error) {
    return masterErrorResponse(error);
  }
}
