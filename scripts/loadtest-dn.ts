/**
 * Data uji beban terisolasi: satu Dealer Night "DN Loadtest" (tidak aktif, jadi
 * tidak muncul di pilihan DN pengguna asli) berisi toko & akun admin sintetis.
 * Semua tulis k6 masuk ke DN ini; DN lain dan penghitung No. Formulir-nya
 * tidak tersentuh. Cleanup hanya menghapus id yang tercatat di manifest.
 *
 * Akun uji dibuat lewat User Management production (bukan langsung ke DB),
 * karena hash password memakai AUTH_SECRET production yang tidak bisa dibaca.
 *
 *   npx tsx --env-file=.env.loadtest scripts/loadtest-dn.ts seed     # DN + toko (DB)
 *   npx tsx --env-file=.env.loadtest scripts/loadtest-dn.ts akun     # 20 akun + sesi (browser)
 *   npx tsx --env-file=.env.loadtest scripts/loadtest-dn.ts cleanup
 */
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { createConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import { chromium } from 'playwright-core';

const MANIFEST = 'load-tests/data/target.json';
const SLUG = 'loadtest';
const JUMLAH_TOKO = 120;
const JUMLAH_STAFF = 20;
const HALAMAN = ['Dashboard Kehadiran', 'Pencatatan Kehadiran', 'Detail Toko Hadir', 'Leaderboard Target DN', 'Detail Target DN', 'Detail Kupon'];
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const DEPOT = [
  { kode: '1S', nama: '1S Bogor' },
  { kode: '5C', nama: '5C Cianjur' },
];

type Manifest = {
  version: 3;
  runId: string;
  dealerNightId: string;
  customers: { id: string; mgCode: string; mgName: string }[];
  staff: { id: string; cookie: string }[];
};

async function koneksi() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL wajib diisi.');
  return createConnection({ uri: url, timezone: 'Z' });
}

async function seed() {
  if (existsSync(MANIFEST)) throw new Error(`${MANIFEST} masih ada: jalankan cleanup run sebelumnya dulu.`);
  const db = await koneksi();
  try {
    const [[lama]] = await db.query<RowDataPacket[]>('select id from dealer_nights where slug = ?', [SLUG]);
    if (lama) throw new Error('DN Loadtest masih ada di database: jalankan cleanup dulu.');

    const runId = `LT${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;
    const dealerNightId = randomUUID();
    await db.beginTransaction();
    await db.query(
      `insert into dealer_nights (id, slug, name, active, event_date, depot_codes, target_pax, target_dn)
       values (?, ?, 'DN Loadtest', false, null, ?, 300, 50000000000)`,
      [dealerNightId, SLUG, JSON.stringify(DEPOT.map((d) => d.kode))],
    );

    const customers: Manifest['customers'] = [];
    for (let i = 1; i <= JUMLAH_TOKO; i += 1) {
      const id = randomUUID();
      const mgCode = `LT${String(i).padStart(4, '0')}`;
      const mgName = `LOADTEST TOKO ${String(i).padStart(4, '0')}`;
      const depot = DEPOT[i % DEPOT.length];
      const target = (50 + Math.floor(Math.random() * 2950)) * 1_000_000;
      await db.query(
        `insert into customers (id, dealer_night_id, mg_code, mg_name, sotp_code, sotp_name, depot_code, depot_name,
           wilayah, region, salesman, spv, target_dn_awal, qty_undangan)
         values (?, ?, ?, ?, ?, ?, ?, ?, 'Indonesia Barat', '4', 'LOADTEST SALES', 'LOADTEST SPV', ?, 1)`,
        [id, dealerNightId, mgCode, mgName, mgCode, mgName, depot.kode, depot.nama, target],
      );
      customers.push({ id, mgCode, mgName });
    }

    await db.commit();

    const manifest: Manifest = { version: 3, runId, dealerNightId, customers, staff: [] };
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    console.log(`Seed ${runId}: DN ${dealerNightId}, ${customers.length} toko. Lanjutkan dengan perintah "akun".`);
  } catch (error) {
    await db.rollback().catch(() => {});
    throw error;
  } finally {
    await db.end();
  }
}

/** Membuat akun uji lewat User Management, lalu login tiap akun untuk mengambil sesinya. */
async function akun() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest;
  const base = (process.env.BASE_URL || 'https://dealer-nite.vercel.app').replace(/\/$/, '');
  const superadmin = process.env.SUPERADMIN_PASSWORD;
  if (!superadmin) throw new Error('SUPERADMIN_PASSWORD wajib diisi di .env.loadtest.');
  if (manifest.staff.length > 0) throw new Error('Akun uji untuk run ini sudah dibuat.');

  const browser = await chromium.launch({ executablePath: EDGE });
  const login = async (password: string) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${base}/login`);
    await page.locator('input[type=password]').fill(password);
    await page.getByRole('button', { name: /masuk/i }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 });
    const cookie = (await context.cookies()).find((c) => c.name === 'dealer_nite_session');
    if (!cookie) throw new Error('Login gagal: cookie sesi tidak ditemukan.');
    return { context, page, cookie: cookie.value };
  };

  const db = await koneksi();
  try {
    const admin = await login(superadmin);
    const passwords: string[] = [];
    for (let i = 1; i <= JUMLAH_STAFF; i += 1) {
      const password = `lt-${manifest.runId}-${i}-${randomUUID().slice(0, 8)}`;
      const page = admin.page;
      await page.goto(`${base}/admin/users`);
      await page.getByRole('button', { name: 'Tambah User' }).click();
      await page.locator('#u-name').fill(`LOADTEST ${manifest.runId} #${i}`);
      await page.locator('#u-pass').fill(password);
      await page.getByRole('checkbox', { name: 'DN Loadtest' }).check();
      await page.locator('[role=dialog] summary').click();
      for (const label of HALAMAN) await page.getByRole('checkbox', { name: new RegExp(`^${label}`) }).check();
      await page.getByRole('button', { name: 'Simpan', exact: true }).click();
      await page.getByText('User dibuat.').first().waitFor({ timeout: 30_000 });
      passwords.push(password);
      console.log(`Akun ${i}/${JUMLAH_STAFF} dibuat`);
    }
    await admin.context.close();

    const [rows] = await db.query<RowDataPacket[]>(
      'select id, full_name from profiles where full_name like ? order by full_name',
      [`LOADTEST ${manifest.runId} #%`],
    );
    const idPerNama = new Map(rows.map((r) => [r.full_name, r.id]));
    for (const [index, password] of passwords.entries()) {
      const id = idPerNama.get(`LOADTEST ${manifest.runId} #${index + 1}`);
      if (!id) throw new Error(`Akun #${index + 1} tidak ditemukan di DB.`);
      const sesi = await login(password);
      await sesi.context.close();
      manifest.staff.push({ id, cookie: sesi.cookie });
    }
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    console.log(`${manifest.staff.length} akun uji siap dengan sesi login.`);
  } finally {
    await browser.close();
    await db.end();
  }
}

async function cleanup() {
  if (!existsSync(MANIFEST)) throw new Error(`${MANIFEST} tidak ada: tidak ada run untuk dibersihkan.`);
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest;
  const db = await koneksi();
  try {
    const [[dn]] = await db.query<RowDataPacket[]>('select id, slug from dealer_nights where id = ?', [manifest.dealerNightId]);
    if (dn && dn.slug !== SLUG) throw new Error('Id DN di manifest bukan DN Loadtest - cleanup dibatalkan.');
    await db.beginTransaction();
    // Hapus DN dulu: customers, kehadiran, riwayat target, dan kupon ikut terhapus (cascade).
    const [hapusDn] = await db.query<ResultSetHeader>('delete from dealer_nights where id = ? and slug = ?', [manifest.dealerNightId, SLUG]);
    // Akun dicocokkan lewat nama yang memuat run ID unik, sehingga akun yang
    // sempat dibuat sebelum proses "akun" gagal di tengah jalan ikut terhapus.
    const [hapusAkun] = await db.query<ResultSetHeader>('delete from profiles where full_name like ?', [`LOADTEST ${manifest.runId} #%`]);
    await db.commit();
    const [[sisa]] = await db.query<RowDataPacket[]>(
      `select (select count(*) from customers where dealer_night_id = ?) toko,
              (select count(*) from reservations where dealer_night_id = ?) hadir,
              (select count(*) from target_adjustments where dealer_night_id = ?) riwayat,
              (select count(*) from kupon_proses where dealer_night_id = ?) kupon`,
      Array(4).fill(manifest.dealerNightId),
    );
    writeFileSync(MANIFEST.replace('target.json', `cleanup-${manifest.runId}.json`), JSON.stringify({ runId: manifest.runId, sisa }));
    unlinkSync(MANIFEST);
    console.log(`Cleanup ${manifest.runId}: DN dihapus ${hapusDn.affectedRows}, akun dihapus ${hapusAkun.affectedRows}, sisa`, sisa);
  } catch (error) {
    await db.rollback().catch(() => {});
    throw error;
  } finally {
    await db.end();
  }
}

const perintah = process.argv[2];
const tugas = { seed, akun, cleanup }[perintah as 'seed' | 'akun' | 'cleanup'];
(tugas ? tugas() : Promise.reject(new Error('Pakai: seed | akun | cleanup')))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
