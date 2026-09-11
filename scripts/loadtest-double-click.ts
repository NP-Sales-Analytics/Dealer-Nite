import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { bacaSeededTarget, db, pastikanTrafficDiizinkan } from './loadtest-common';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

function chromiumExecutable() {
  const root = path.join(process.env.LOCALAPPDATA ?? '', 'ms-playwright');
  const candidates = existsSync(root)
    ? readdirSync(root)
        .filter((name) => name.startsWith('chromium-'))
        .sort()
        .reverse()
        .map((name) => path.join(root, name, 'chrome-win64', 'chrome.exe'))
    : [];
  const executable = candidates.find(existsSync);
  if (!executable) throw new Error('Chromium Playwright tidak ditemukan.');
  return executable;
}

async function ringkas(sql: ReturnType<typeof db>, customerId: string) {
  const [row] = await sql<{ rows: number; total: number }[]>`
    select count(*)::int as rows, coalesce(sum(qty_change), 0)::int as total
    from public.order_adjustments where customer_id = ${customerId}`;
  return row;
}

async function main() {
  const target = bacaSeededTarget();
  pastikanTrafficDiizinkan(BASE, target.runId);
  const customer = target.customers[190];
  if (!customer) throw new Error('Double-click test memerlukan minimal 191 customer dummy.');

  const sql = db(1, target.runId);
  const browser = await chromium.launch({ executablePath: chromiumExecutable() });
  let posts = 0;
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([{ name: 'pylox_session', value: customer.cookie, url: BASE }]);
    const page = await context.newPage();
    page.on('request', (request) => {
      if (request.method() === 'POST' && request.url().endsWith('/api/order/adjust')) posts++;
    });

    await page.goto(`${BASE}/leaderboard`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Tambah Order', exact: true }).click();
    await page.getByRole('button', { name: 'Tambah satu' }).click();
    const simpan = page.getByRole('button', { name: 'Simpan +1 dus' });
    await simpan.waitFor({ state: 'visible' });

    const before = await ringkas(sql, customer.id);
    await simpan.evaluate((element) => {
      (element as HTMLButtonElement).click();
      (element as HTMLButtonElement).click();
    });
    await page.waitForTimeout(10_000);
    const after = await ringkas(sql, customer.id);

    const lulus = posts === 1 && after.rows - before.rows === 1 && after.total - before.total === 1;
    console.log(`Rapid double-click: ${lulus ? 'LULUS' : 'GAGAL'}`);
    console.log(`  POST tertangkap : ${posts} (harus 1)`);
    console.log(`  delta ledger    : ${after.rows - before.rows} baris / ${after.total - before.total} dus`);
    process.exitCode = lulus ? 0 : 1;
  } finally {
    await browser.close();
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
