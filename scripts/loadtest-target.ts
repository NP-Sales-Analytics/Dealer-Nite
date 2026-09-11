import { createHmac } from 'node:crypto';
import {
  READONLY_TARGET_FILE,
  type ReadOnlyTarget,
  db,
  tulisJson,
} from './loadtest-common';

/**
 * Menyiapkan target-readonly.json terpisah untuk skenario BACA saja. Manifest
 * seeded tidak pernah ditimpa, sehingga cleanup run aktif tetap dapat bekerja.
 *
 * Hanya SELECT - tidak ada satu pun baris yang ditulis, jadi aman dijalankan ke
 * produksi untuk mengukur jalur baca leaderboard. Cookie ditandatangani lokal
 * dengan AUTH_SECRET yang sama seperti server, sepola signSession di
 * lib/session.ts.
 *
 *   IZINKAN_PRODUKSI=1 tsx --env-file=.env.local scripts/loadtest-target.ts
 */
const JUMLAH = Number(process.env.JUMLAH ?? 200);
const MAX_AGE_S = 12 * 3600;

function cookie(kind: 'customer' | 'team', id: string, secret: string) {
  const body = Buffer.from(`${kind}:${id}:${Date.now() + MAX_AGE_S * 1000}`).toString('base64url');
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
}

async function main() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET belum diset.');

  const sql = db(1);
  try {
    const customers = await sql<{ id: string; kode_sap: string }[]>`
      select id, kode_sap from public.customers order by created_at asc limit ${JUMLAH}`;
    if (customers.length === 0) throw new Error('Tidak ada customer di database ini.');

    // Staf dipakai skenario tulis (checkin/search); untuk uji baca isinya boleh
    // kosong, jadi tidak dipaksa ada. Bentuknya array supaya sebentuk dengan
    // target.json yang ditulis loadtest-seed.
    const staff = await sql<{ id: string }[]>`
      select id from public.profiles where role = 'superadmin' order by created_at asc`;

    const target: ReadOnlyTarget = {
      version: 2,
      mode: 'read-only',
      dibuat: new Date().toISOString(),
      staff: staff.map((s) => ({ id: s.id, cookie: cookie('team', s.id, secret) })),
      customers: customers.map((c) => ({
        id: c.id,
        kodeSap: c.kode_sap,
        cookie: cookie('customer', c.id, secret),
      })),
    };
    tulisJson(READONLY_TARGET_FILE, target);
    console.log(
      `${READONLY_TARGET_FILE}: ${customers.length} customer, ${staff.length} staf (read-only)`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
