// Screenshot guidebook DN Administration System (mode baca saja).
//
//   GUIDE_USER=<nama lengkap> GUIDE_PASS=... node docs/guidebook/capture.js
//
// Username = Nama Lengkap di User Management. Kredensial sengaja tidak punya
// nilai bawaan di file ini.
// Script TIDAK pernah menekan Simpan/Hapus/Upload/Catat/Tandai; form hanya
// dibuka lalu ditutup dengan Escape.
const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../../node_modules/playwright-core'));

const BASE = process.env.GUIDE_URL || 'https://dn.bi-nipponpaint.com';
const USER = process.env.GUIDE_USER;
const PASS = process.env.GUIDE_PASS;
const DN = process.env.GUIDE_DN || 'DN Bogor';
const OUT = path.join(__dirname, 'screens');
const EXE = process.env.CHROME_PATH
  || path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'chromium-1208', 'chrome-win64', 'chrome.exe');
const ONLY = process.argv[2]; // opsional: awalan nama file, mis. "1" untuk modul Kehadiran saja

if (!USER || !PASS) { console.error('Set GUIDE_USER dan GUIDE_PASS dulu.'); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

// Screenshot memakai data asli tanpa penyamaran (keputusan pemilik dokumen).
// Dari respons API hanya diambil satu toko yang belum hadir, untuk contoh form
// pencatatan.
let belumHadir = null;
function cariBelumHadir(v) {
  if (Array.isArray(v)) return v.forEach(cariBelumHadir);
  if (v && v.mgCode && v.qtyHadir === null && v.verifiedAt && !belumHadir) belumHadir = String(v.mgCode);
  if (v && typeof v === 'object') Object.values(v).forEach(cariBelumHadir);
}

// Sembunyikan toast dan kursor ketik supaya tidak mengganggu gambar.
async function rapikan(page) {
  await page.addStyleTag({ content: '[data-sonner-toaster]{display:none!important} *{caret-color:transparent!important}' });
}

async function tunggu(page, ms = 1500) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('.animate-pulse'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

const hasil = [];
async function shot(page, nama) {
  if (ONLY && !nama.startsWith(ONLY)) return;
  await tunggu(page, 800);
  await rapikan(page);
  await page.screenshot({ path: path.join(OUT, nama + '.png') });
  hasil.push(nama);
  console.log('ok', nama);
}

async function buka(page, rute) {
  await page.goto(BASE + rute, { waitUntil: 'domcontentloaded' });
  await tunggu(page);
}

async function pilihDN(page) {
  const trigger = page.locator('main button[role=combobox]').first();
  if ((await trigger.innerText()).includes(DN)) return;
  await trigger.click();
  await page.getByRole('option', { name: DN, exact: true }).click();
  await tunggu(page);
}

async function pilihFilter(page, label, opsi) {
  await page.locator(`main [aria-label="${label}"]`).first().click();
  await page.waitForTimeout(500);
  if (opsi) {
    await page.getByRole('option', { name: opsi, exact: true }).click();
    await page.keyboard.press('Escape');
    await tunggu(page, 800);
  }
}

const tutup = (page) => page.keyboard.press('Escape').then(() => page.waitForTimeout(600));

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('response', async (res) => {
    if (!res.url().includes('/api/') || !(res.headers()['content-type'] || '').includes('json')) return;
    try { cariBelumHadir(await res.json()); } catch { /* bukan JSON */ }
  });

  // ---- 0. Login & tampilan utama
  await buka(page, '/login');
  await shot(page, '01-login');
  await page.fill('#username', USER);
  await page.fill('#password', PASS);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith('/login')), page.click('button[type=submit]')]);

  // Buka Detail Target DN dulu: respons list-nya dipakai untuk mencari toko
  // yang belum hadir sebagai contoh form pencatatan.
  await buka(page, '/order/detail');
  await pilihDN(page);

  await buka(page, '/reservation');
  await pilihDN(page);
  await shot(page, '02-tampilan-utama');
  await page.click('button[aria-label="Buka navigasi"]');
  await page.waitForTimeout(800);
  await shot(page, '03-sidebar-menu');
  await page.click('button[aria-label="Tutup navigasi"]');
  await page.waitForTimeout(600);

  // ---- 1. Modul Kehadiran
  await shot(page, '10-pencatatan-awal');
  // Cari pakai awalan MG Code supaya muncul beberapa hasil.
  const cari = page.locator('input[aria-label="Cari toko"]');
  if (belumHadir) {
    await cari.fill(belumHadir.slice(0, 3));
    await page.waitForTimeout(1500);
    await shot(page, '11-pencatatan-cari');
    await cari.fill(belumHadir);
    await page.waitForTimeout(1500);
  }
  const pilihan = page.locator('main ul li button').filter({ hasNot: page.getByText('Sudah dicatat') }).first();
  if (await pilihan.count()) {
    await pilihan.click();
    await page.waitForTimeout(800);
    await page.fill('#undian', '0123');
    await shot(page, '12-pencatatan-form');
    await page.getByRole('button', { name: 'Batal', exact: true }).click(); // kembali, tidak menyimpan
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: 'Tidak ditemukan? Tambah manual' }).click();
  await page.waitForTimeout(800);
  await shot(page, '13-pencatatan-manual');
  await tutup(page);

  await buka(page, '/dashboard');
  await pilihDN(page);
  await shot(page, '14-dashboard');
  await pilihFilter(page, 'Depot');
  await shot(page, '15-dashboard-filter-depot');
  await tutup(page);

  await buka(page, '/kehadiran');
  await pilihDN(page);
  await shot(page, '16-detail-hadir-list');
  await page.locator('main tbody tr').first().click();
  await page.waitForTimeout(800);
  await shot(page, '17-detail-hadir-dialog');
  await tutup(page);
  await page.locator('main tbody tr').first().locator('button[title="Ubah"]').click();
  await page.waitForTimeout(800);
  await shot(page, '18-detail-hadir-ubah');
  await tutup(page);

  // ---- 2. Modul Detail Target DN
  await buka(page, '/order/detail');
  await pilihDN(page);
  await shot(page, '20-target-list');
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(600);
  await shot(page, '21-target-tabel');
  await page.mouse.wheel(0, -2000);
  await pilihFilter(page, 'Kehadiran');
  await shot(page, '22-target-filter-kehadiran');
  await tutup(page);
  await page.getByRole('tab', { name: /Belum Verifikasi/ }).click();
  await tunggu(page, 600);
  await shot(page, '23-target-tab-belum');
  if (await page.locator('main tbody tr').count()) {
    await page.locator('main tbody tr').first().click();
    await tunggu(page, 1200);
    await shot(page, '24-target-dialog-verifikasi');
    await tutup(page);
  }
  await page.getByRole('tab', { name: /Terverifikasi/ }).click();
  await pilihFilter(page, 'Penambahan', 'Ada Penambahan');
  await page.locator('main tbody tr').first().click();
  await tunggu(page, 1200);
  await shot(page, '25-target-dialog-penyesuaian');
  const nilai = await page.inputValue('#target-value');
  const angka = Number(nilai.replace(/\D/g, '')) + 50_000_000;
  await page.fill('#target-value', String(angka));
  await page.waitForTimeout(500);
  await shot(page, '26-target-isi-nominal');
  await tutup(page);
  await page.getByRole('button', { name: 'Tambah Master Data' }).click();
  await page.waitForTimeout(800);
  await shot(page, '27-target-tambah-master');
  await tutup(page);
  await page.getByRole('button', { name: 'Upload Master' }).click();
  await page.waitForTimeout(800);
  await shot(page, '28-target-upload-master');
  await tutup(page);

  // ---- 3. Modul Detail Kupon
  await buka(page, '/kupon');
  await pilihDN(page);
  await shot(page, '30-kupon-ringkasan');
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(600);
  await shot(page, '31-kupon-tabel');
  await page.mouse.wheel(0, -2000);
  for (const [label, file] of [['Perlu Dibuat', '32-kupon-dialog-buat'], ['Siap Diberikan', '33-kupon-dialog-berikan']]) {
    const kartu = page.locator('main button[aria-pressed]').filter({ hasText: label });
    const n = Number((await kartu.innerText()).match(/\d+/)?.[0] || 0);
    if (!n) { console.log('lewati', file, '(0 toko)'); continue; }
    await kartu.click();
    await tunggu(page, 600);
    await page.locator('main tbody tr').first().click();
    await tunggu(page, 1200);
    await shot(page, file);
    await tutup(page);
    await kartu.click(); // kembali ke semua status
    await tunggu(page, 400);
  }
  const cek = page.locator('main tbody input[type=checkbox]');
  await cek.nth(0).check();
  await cek.nth(1).check();
  await page.waitForTimeout(500);
  await shot(page, '34-kupon-aksi-massal');
  await cek.nth(0).uncheck();
  await cek.nth(1).uncheck();

  // ---- 4. Leaderboard (gambaran umum)
  await buka(page, '/leaderboard');
  await pilihDN(page);
  await shot(page, '40-leaderboard');

  await browser.close();
  console.log(`selesai: ${hasil.length} screenshot`);
})().catch((e) => { console.error(e); process.exit(1); });
