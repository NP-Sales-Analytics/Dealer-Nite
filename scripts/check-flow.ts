import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const EXE = path.join(process.env.LOCALAPPDATA!, 'ms-playwright', 'chromium-1208', 'chrome-win64', 'chrome.exe');
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

const ok = (label: string, pass: boolean, extra = '') =>
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${extra ? '  -> ' + extra : ''}`);

async function main() {
  const jar = readFileSync(process.env.COOKIE_FILE ?? 'cookies.txt', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#'));
  const cookies = jar.map((l) => {
    const f = l.split('\t');
    return { name: f[5], value: f[6], domain: new URL(BASE).hostname, path: '/' };
  });

  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const dialogs: string[] = [];
  page.on('dialog', async (d) => { dialogs.push(d.message()); await d.accept(); });

  // --- Alur 1: toko yang belum pernah dicatat ---
  await page.goto(BASE + '/reservation', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await page.getByPlaceholder('Ketik nama toko atau MG Code...').fill('halim');
  await page.waitForTimeout(1500);

  const hasil = page.locator('button', { hasText: 'HALIM' }).first();
  const munculDropdown = await hasil.waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false);
  ok('dropdown menampilkan hasil pencarian', munculDropdown);
  const teksHasil = await hasil.innerText().catch(() => '');
  ok('item dropdown memuat MG Code + depot', /\d{6}/.test(teksHasil) && teksHasil.includes('undangan'), teksHasil.replace(/\n/g, ' / '));

  await hasil.click();
  await page.waitForTimeout(600);
  const kartu = await page.locator('text=MG Code').count();
  ok('kartu detail muncul setelah dipilih', kartu > 0);

  await page.locator('#qty').fill('1');
  await page.getByRole('button', { name: 'Simpan Kehadiran' }).click();
  // Toko ini mungkin sudah pernah dicatat dari run sebelumnya; kalau dialog
  // duplikat muncul, setujui supaya alur lanjut.
  const dupAwal = page.getByRole('button', { name: 'Ya, ganti' });
  if (await dupAwal.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false)) {
    await dupAwal.click();
  }
  await page.waitForTimeout(2500);

  const toastSukses = await page.locator('text=tercatat hadir').first()
    .waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false);
  ok('toast sukses tampil', toastSukses);
  const formReset = await page.getByPlaceholder('Ketik nama toko atau MG Code...')
    .waitFor({ state: 'visible', timeout: 20000 }).then(() => true, () => false);
  ok('form kembali ke pencarian (siap toko berikutnya)', formReset);

  // --- Alur 2: toko yang SUDAH dicatat -> konfirmasi ---
  await page.getByPlaceholder('Ketik nama toko atau MG Code...').fill('halim');
  await page.waitForTimeout(1500);
  const badge = await page.locator('text=Sudah dicatat').count();
  ok('badge "Sudah dicatat" muncul di dropdown', badge > 0);

  await page.locator('button', { hasText: 'HALIM' }).first().click();
  await page.waitForTimeout(500);
  await page.locator('#qty').fill('9');
  await page.getByRole('button', { name: 'Simpan Kehadiran' }).click();

  // Konfirmasi sekarang AlertDialog di dalam halaman, bukan confirm() native,
  // jadi page.on('dialog') tidak akan pernah menyala. Tunggu teksnya muncul lalu
  // tekan tombol aksinya.
  const dialogDuplikat = page.getByRole('alertdialog').filter({ hasText: /sudah tercatat hadir/i });
  const adaDuplikat = await dialogDuplikat
    .waitFor({ state: 'visible', timeout: 25000 }).then(() => true, () => false);
  ok('konfirmasi duplikat muncul', adaDuplikat,
    adaDuplikat ? (await dialogDuplikat.innerText()).split(String.fromCharCode(10)).join(' ') : '(tidak ada)');
  if (adaDuplikat) await page.getByRole('button', { name: 'Ya, ganti' }).click();

  const dialogKuota = page.getByRole('alertdialog').filter({ hasText: /melebihi undangan/i });
  const adaKuota = await dialogKuota
    .waitFor({ state: 'visible', timeout: 25000 }).then(() => true, () => false);
  ok('konfirmasi melebihi undangan muncul', adaKuota,
    adaKuota ? (await dialogKuota.innerText()).split(String.fromCharCode(10)).join(' ') : '(tidak ada)');
  if (adaKuota) await page.getByRole('button', { name: 'Tetap simpan' }).click();
  await page.waitForTimeout(2000);

  // --- Alur 3: manual entry ---
  await page.waitForTimeout(500);
  await page.getByRole('button', { name: 'Tidak ditemukan? Tambah manual' }).click();
  await page.waitForTimeout(600);
  await page.locator('#m-nama').fill('CV Uji Alur Otomatis');
  await page.locator('#m-depot').fill('1S');
  await page.locator('#m-qty').fill('2');
  const datalistOptions = await page.locator('#depot-list option').count();
  ok('datalist depot terisi', datalistOptions > 0, `${datalistOptions} opsi`);
  // Tunggu toast MUNCUL, jangan hitung setelah jeda tetap: sonner menutup
  // toast sendiri setelah ~4 detik, sehingga hitungan telat selalu nol.
  const toastManual = page.locator('text=CV Uji Alur Otomatis').first();
  await page.getByRole('button', { name: 'Simpan', exact: true }).click();
  ok('manual entry tersimpan',
    await toastManual.waitFor({ state: 'visible', timeout: 25000 }).then(() => true, () => false));

  ok('tidak ada error JavaScript', errors.length === 0, errors[0] ?? '');

  await page.screenshot({ path: 'C:/Users/user/AppData/Local/Temp/reservation.png', fullPage: false });
  await browser.close();
}

main().catch((e) => { console.error('GAGAL:', e.message); process.exit(1); });
