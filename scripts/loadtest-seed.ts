import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import {
  TARGET_FILE,
  type SeededTarget,
  bacaActiveRun,
  db,
  kodeCustomer,
  namaCustomer,
  namaStaff,
  tulisActiveRun,
  tulisJson,
} from './loadtest-common';

const JUMLAH = Number(process.argv[2] ?? 200);
const STAFF = Number(process.env.STAFF ?? 20);
const WILAYAH = ['Indonesia Barat', 'Indonesia Timur'];
const REGION = ['3A', '3B', '2C', '5A', '1P'];
const DEPOT = ['1A Jakarta', '1D THK', '3E Malang', '4A Medan', '5O Serpong'];
const MAX_AGE_S = 12 * 3600;

function cookieSesi(kind: 'team' | 'customer', id: string, secret: string) {
  const body = Buffer.from(`${kind}:${id}:${Date.now() + MAX_AGE_S * 1000}`).toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

async function main() {
  if (!Number.isInteger(JUMLAH) || JUMLAH < 200 || JUMLAH > 500) {
    throw new Error('Jumlah customer dummy harus bilangan 200-500.');
  }
  if (!Number.isInteger(STAFF) || STAFF < 1 || STAFF > 50) {
    throw new Error('Jumlah staff dummy harus bilangan 1-50.');
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET belum diset.');

  const active = bacaActiveRun();
  if (active.status !== 'snapshotted') {
    throw new Error(`Run ${active.runId} berstatus ${active.status}; seed hanya boleh setelah snapshot.`);
  }

  const customers = Array.from({ length: JUMLAH }, (_, index) => {
    const id = randomUUID();
    return {
      id,
      kodeSap: kodeCustomer(active.runId, index),
      namaToko: namaCustomer(active.runId, index),
      cookie: cookieSesi('customer', id, secret),
    };
  });
  const staff = Array.from({ length: STAFF }, (_, index) => {
    const id = randomUUID();
    return {
      id,
      fullName: namaStaff(active.runId, index),
      cookie: cookieSesi('team', id, secret),
    };
  });
  const target: SeededTarget = {
    version: 2,
    mode: 'seeded',
    runId: active.runId,
    dibuat: new Date().toISOString(),
    staff,
    customers,
  };

  // Manifest ditulis sebelum INSERT. Jika proses mati di tengah, semua UUID
  // yang mungkin ada di database tetap diketahui dan dapat dibersihkan tepat.
  tulisJson(TARGET_FILE, target);
  tulisActiveRun({ ...active, status: 'seeding' });

  const sql = db(4, active.runId);
  try {
    await sql.begin(async (tx) => {
      for (let index = 0; index < customers.length; index++) {
        const customer = customers[index];
        await tx`
          insert into public.customers
            (id, nama_toko, kode_sap, wilayah, region, depot, qty_undangan)
          values (
            ${customer.id}, ${customer.namaToko}, ${customer.kodeSap},
            ${WILAYAH[index % WILAYAH.length]}, ${REGION[index % REGION.length]},
            ${DEPOT[index % DEPOT.length]}, 2
          )`;
      }
      for (const account of staff) {
        await tx`
          insert into public.profiles (id, full_name, role, password_hash, allowed_pages)
          values (
            ${account.id}, ${account.fullName}, 'superadmin',
            ${randomBytes(32).toString('hex')}, '{}'
          )`;
      }
    });
    tulisActiveRun({ ...active, status: 'seeded' });
    console.log(`Run ${active.runId}: ${customers.length} customer + ${staff.length} staff dibuat.`);
    console.log(`${TARGET_FILE} berisi UUID dan cookie khusus run ini.`);
  } catch (error) {
    console.error('Seed gagal; transaksi di-rollback. Manifest dipertahankan untuk verifikasi cleanup.');
    throw error;
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
