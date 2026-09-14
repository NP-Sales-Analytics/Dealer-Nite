import { sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import writeExcelFile from 'write-excel-file/node';
import { requireRoleApi } from '@/lib/auth';
import { db } from '@/lib/db';
import { angka, header, teks, waktuWib } from '@/lib/excel/kolom';

type Riwayat = { waktu: string; jumlah: number };
type BarisAudit = {
  kodeSap: string;
  namaToko: string;
  total: number;
  terakhir: string | null;
  riwayat: Riwayat[];
};

/**
 * Satu baris berkoma per baris data. Dikutip hanya kalau isinya mengandung
 * koma, kutip, atau baris baru - nama toko sesekali memuat koma ("PT. A, B").
 */
function baristCsv(nilai: (string | number)[]): string {
  return nilai
    .map((v) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(',');
}

/**
 * Riwayat penyesuaian mentah, satu baris per toko dengan seluruh riwayatnya
 * terentang ke kanan - dipakai untuk audit waktu pengambilan sebenarnya
 * (menentukan siapa yang benar-benar lebih dulu mencapai angkanya, sesuai
 * pemecah seri di lib/order/papan.ts: total desc, lalu waktu TERAKHIR asc).
 *
 * SENGAJA TANPA terapkanScope - beda dengan /api/order/export. Berkas itu
 * memang harus sama persis dengan yang RSM lihat di layarnya sendiri (region-
 * nya saja). Berkas INI untuk mengadili pemenang kontes top order secara
 * keseluruhan, jadi harus memuat SEMUA toko lintas region - persis alasan
 * papan peringkat sendiri sengaja tidak dibatasi region (lihat komentar di
 * lib/order/akses.ts). Karena itu juga dibatasi ke superadmin/admin_rsvp
 * saja, bukan empat role seperti dua ekspor lain: ini bukan "unduh yang
 * sedang saya lihat", tapi bukti audit lintas region.
 */
export async function GET(request: NextRequest) {
  const user = await requireRoleApi(['superadmin', 'admin_rsvp']);
  if (user instanceof NextResponse) return user;

  if (!user.bolehUnduh) {
    return NextResponse.json({ error: 'Tidak punya izin mengunduh data' }, { status: 403 });
  }

  // Satu query flat (bukan json_agg): lebih mudah diaudit dan tidak
  // bergantung pada bagaimana driver mem-parse kolom JSON. customers ratusan
  // dan order_adjustments ribuan baris - pengelompokan di JS jauh lebih murah
  // daripada risiko salah baca hasil agregat.
  const baris = (await db.execute(sql`
    select c.id         as "customerId",
           c.kode_sap   as "kodeSap",
           c.nama_toko  as "namaToko",
           oa.created_at as waktu,
           oa.qty_change as jumlah
    from public.customers c
    left join public.order_adjustments oa on oa.customer_id = c.id
    order by c.kode_sap asc, oa.created_at asc
  `)) as unknown as {
    customerId: string; kodeSap: string; namaToko: string;
    waktu: string | null; jumlah: number | null;
  }[];

  const perToko = new Map<string, BarisAudit>();
  for (const r of baris) {
    let b = perToko.get(r.customerId);
    if (!b) {
      b = { kodeSap: r.kodeSap, namaToko: r.namaToko, total: 0, terakhir: null, riwayat: [] };
      perToko.set(r.customerId, b);
    }
    if (r.waktu !== null && r.jumlah !== null) {
      b.riwayat.push({ waktu: r.waktu, jumlah: r.jumlah });
      b.total += r.jumlah;
      b.terakhir = r.waktu;
    }
  }

  // Urutan sama persis dengan papan peringkat: total desc, lalu waktu
  // pencapaian TERAKHIR asc - itulah pemecah seri yang menentukan pemenang.
  const hasil = [...perToko.values()].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.terakhir !== b.terakhir) {
      if (a.terakhir === null) return 1;
      if (b.terakhir === null) return -1;
      return a.terakhir.localeCompare(b.terakhir);
    }
    return a.namaToko.localeCompare(b.namaToko, 'id');
  });

  const maksRiwayat = hasil.reduce((m, b) => Math.max(m, b.riwayat.length), 0);
  const kolomRiwayat = Array.from({ length: maksRiwayat }, (_, i) => i);

  const stempel = new Date()
    .toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' })
    .replace(/-/g, '');

  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const judul = [
      'Kode SAP', 'Nama Toko', 'Total Saat Ini',
      ...kolomRiwayat.flatMap((i) => [`Waktu ${i + 1}`, `Penyesuaian ${i + 1}`]),
    ];
    const teksBaris = hasil.map((r) =>
      baristCsv([
        r.kodeSap,
        r.namaToko,
        r.total,
        ...kolomRiwayat.flatMap((i) => [
          waktuWib(r.riwayat[i]?.waktu ?? null),
          r.riwayat[i] !== undefined ? r.riwayat[i].jumlah : '',
        ]),
      ]),
    );
    // BOM di depan supaya Excel membuka karakter non-ASCII (nama toko) dengan
    // benar saat berkas ini diklik ganda, bukan cuma dibuka lewat "Import Data".
    const csv = '﻿' + [baristCsv(judul), ...teksBaris].join('\r\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="Riwayat-Penyesuaian-Pylox-${stempel}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  const KOLOM = [
    { header: header('Kode SAP'), width: 12, cell: (r: BarisAudit) => teks(r.kodeSap) },
    { header: header('Nama Toko'), width: 34, cell: (r: BarisAudit) => teks(r.namaToko) },
    { header: header('Total Saat Ini'), width: 14, cell: (r: BarisAudit) => angka(r.total) },
    ...kolomRiwayat.flatMap((i) => [
      {
        header: header(`Waktu ${i + 1}`),
        width: 20,
        cell: (r: BarisAudit) => teks(waktuWib(r.riwayat[i]?.waktu ?? null)),
      },
      {
        header: header(`Penyesuaian ${i + 1}`),
        width: 14,
        cell: (r: BarisAudit) => angka(r.riwayat[i]?.jumlah),
      },
    ]),
  ];

  const buffer = await writeExcelFile(hasil, {
    columns: KOLOM,
    sheet: 'Riwayat Penyesuaian',
    stickyRowsCount: 1,
  }).toBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Riwayat-Penyesuaian-Pylox-${stempel}.xlsx"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
