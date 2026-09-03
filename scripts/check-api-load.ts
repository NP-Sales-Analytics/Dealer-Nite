import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from 'playwright-core';

const EXE = path.join(process.env.LOCALAPPDATA!, 'ms-playwright', 'chromium-1208', 'chrome-win64', 'chrome.exe');
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

let gagal = 0;
const ok = (label: string, lulus: boolean, extra = '') => {
  if (!lulus) gagal++;
  console.log(`${lulus ? 'PASS' : 'FAIL'}  ${label}${extra ? '  -> ' + extra : ''}`);
};

function cookies(domain: string) {
  const file = process.env.COOKIE_FILE ?? 'cookies.txt';
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const f = l.split('\t');
      return { name: f[5], value: f[6], domain, path: '/' };
    });
}

/** Menghitung request ke /api/ selama satu aksi, dalam jendela pendek supaya
 *  polling 15 detik tidak ikut terhitung. */
async function hitung(p: Page, aksi: () => Promise<void>, jeda = 3000) {
  const url: string[] = [];
  const rekam = (r: { url: () => string }) => {
    const u = r.url();
    if (u.includes('/api/')) url.push(u.replace(BASE, ''));
  };
  p.on('request', rekam);
  await aksi();
  await p.waitForTimeout(jeda);
  p.off('request', rekam);
  return url;
}

async function main() {
  const domain = new URL(BASE).hostname;
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addCookies(cookies(domain));
  const p = await ctx.newPage();

  // ---------- Halaman Toko Hadir ----------
  await p.goto(`${BASE}/kehadiran`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);

  const keNext = await hitung(p, async () => {
    await p.getByLabel('Halaman berikutnya').click();
  });
  ok('pindah ke halaman berikutnya = 1 request', keNext.length === 1,
    `${keNext.length} request: ${keNext.join(', ') || '-'}`);

  const kembali = await hitung(p, async () => {
    await p.getByLabel('Halaman sebelumnya').click();
  });
  ok('kembali ke halaman yang sudah dibuka = 0 request (dari cache)', kembali.length === 0,
    `${kembali.length} request: ${kembali.join(', ') || '-'}`);

  const gantiRegion = await hitung(p, async () => {
    await p.getByRole('combobox').first().click();
    await p.waitForTimeout(400);
    await p.getByRole('option').nth(1).click();
  });
  ok('ganti region = 1 request daftar', gantiRegion.length === 1,
    `${gantiRegion.length} request: ${gantiRegion.join(', ') || '-'}`);

  const reset = await hitung(p, async () => {
    await p.getByRole('button', { name: 'Reset' }).click();
  });
  ok('reset filter = maksimal 1 request', reset.length <= 1,
    `${reset.length} request: ${reset.join(', ') || '-'}`);

  // ---------- Dashboard ----------
  await p.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);

  const gantiRegionDash = await hitung(p, async () => {
    await p.getByRole('combobox').first().click();
    await p.waitForTimeout(400);
    await p.getByRole('option').nth(1).click();
  });
  // summary + by-depot ikut berubah; daftar filter tidak boleh ikut diambil ulang.
  ok('ganti region di dashboard = 2 request (summary + depot)', gantiRegionDash.length === 2,
    `${gantiRegionDash.length} request: ${gantiRegionDash.join(', ') || '-'}`);
  ok('daftar filter tidak diambil ulang saat memfilter',
    !gantiRegionDash.some((u) => u.includes('/filters')),
    gantiRegionDash.join(', ') || '-');

  // ---------- Search bar ----------
  await p.goto(`${BASE}/reservation`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);

  const kotak = p.getByLabel('Cari toko');
  const ketik = await hitung(p, async () => {
    // delay 80ms: kecepatan mengetik wajar, jauh di bawah jeda debounce 300ms.
    await kotak.pressSequentially('panta', { delay: 80 });
  });
  ok('ketik 5 huruf = 1 request pencarian', ketik.length === 1,
    `${ketik.length} request: ${ketik.join(', ') || '-'}`);

  const ulang = await hitung(p, async () => {
    for (let i = 0; i < 5; i++) await kotak.press('Backspace');
    await kotak.pressSequentially('panta', { delay: 80 });
  });
  ok('hapus lalu ketik ulang kata sama = 0 request (staleTime 30 detik)', ulang.length === 0,
    `${ulang.length} request: ${ulang.join(', ') || '-'}`);

  const pendek = await hitung(p, async () => {
    for (let i = 0; i < 4; i++) await kotak.press('Backspace');
  });
  ok('sisa 1 huruf tidak menembak API', pendek.length === 0,
    `${pendek.length} request: ${pendek.join(', ') || '-'}`);

  // ---------- Waktu perpindahan halaman ----------
  // Dua angka yang berbeda artinya: "terasa" = kapan layar berhenti diam
  // (skeleton loading.tsx muncul), "selesai" = kapan judul halaman tujuan ada.
  const navigasi = async (label: string, judul: string) => {
    const a = Date.now();
    await p.getByRole('link', { name: label }).click();
    await p.locator('[data-slot="skeleton"], h1').first().waitFor({ state: 'visible' });
    const terasa = Date.now() - a;
    await p.getByRole('heading', { name: judul, level: 1 }).waitFor({ state: 'visible' });
    return { terasa, selesai: Date.now() - a };
  };

  await p.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000);

  for (const [label, judul] of [
    ['Toko Hadir', 'Toko Hadir'],
    ['Pencatatan', 'Pencatatan Kehadiran'],
    ['Dashboard', 'Dashboard Kehadiran'],
  ] as const) {
    const { terasa, selesai } = await navigasi(label, judul);
    ok(`nav ke ${label}: layar merespons < 150ms`, terasa < 150, `${terasa}ms`);
    ok(`nav ke ${label}: konten siap < 600ms`, selesai < 600, `${selesai}ms`);
  }

  // ---------- Bolak-balik antar halaman ----------
  const bolakBalik = await hitung(p, async () => {
    await p.getByRole('link', { name: 'Toko Hadir' }).click();
    await p.waitForTimeout(2500);
    await p.getByRole('link', { name: 'Dashboard' }).click();
  }, 3500);
  ok('bolak-balik antar halaman memakai cache, <= 3 request', bolakBalik.length <= 3,
    `${bolakBalik.length} request: ${bolakBalik.join(', ') || '-'}`);

  await b.close();

  // ---------- Biaya per request ----------
  // Jumlah request sudah minimal; yang memberatkan adalah harga tiap request.
  const cookieHeader = cookies(domain).map((c) => `${c.name}=${c.value}`).join('; ');
  const waktu = async (p2: string, n = 5) => {
    const t: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = Date.now();
      await (await fetch(BASE + p2, { headers: { cookie: cookieHeader } })).text();
      t.push(Date.now() - a);
    }
    return t.sort((x, y) => x - y)[Math.floor(n / 2)];
  };

  const tanpaAuth = await fetch(`${BASE}/api/dashboard/summary`, { redirect: 'manual' });
  ok('API tanpa login menjawab 401, bukan redirect 307', tanpaAuth.status === 401,
    `status ${tanpaAuth.status}`);

  const tSummary = await waktu('/api/dashboard/summary');
  ok('endpoint ber-cache < 250ms', tSummary < 250, `${tSummary}ms`);

  const tRecent = await waktu('/api/dashboard/recent?page=1');
  ok('daftar kehadiran < 400ms', tRecent < 400, `${tRecent}ms`);

  if (gagal > 0) process.exitCode = 1;
}

main().catch((e) => { console.error('GAGAL:', e.message); process.exit(1); });
