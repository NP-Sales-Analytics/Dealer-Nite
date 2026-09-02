import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const EXE = path.join(process.env.LOCALAPPDATA!, 'ms-playwright', 'chromium-1208', 'chrome-win64', 'chrome.exe');

async function main() {
  const url = process.argv[2];
  const shot = process.argv[3];

  const domain = new URL(url).hostname;
  const jarFile = process.env.COOKIE_FILE ?? 'cookies.txt';
  const jar = readFileSync(jarFile, 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#'));
  const cookies = jar.map((l) => {
    const f = l.split('\t');
    return { name: f[5], value: f[6], domain, path: '/' };
  });

  const browser = await chromium.launch({ executablePath: EXE });
  // VIEWPORT=375x812 untuk memotret tampilan HP.
  const [vw, vh] = (process.env.VIEWPORT ?? '1440x1800').split('x').map(Number);
  const ctx = await browser.newContext({
    viewport: { width: vw, height: vh },
    isMobile: vw < 768,
    hasTouch: vw < 768,
  });
  await ctx.addCookies(cookies);
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(4000);

  console.log('--- URL:', page.url());
  console.log('--- TEKS:', (await page.innerText('body')).replace(/\n+/g, ' | ').slice(0, 500));
  console.log('--- SVG chart:', await page.locator('svg.recharts-surface').count());
  console.log('--- ERRORS:', errors.length ? '\n' + errors.slice(0, 6).join('\n') : 'tidak ada');

  if (shot) { await page.screenshot({ path: shot, fullPage: true }); console.log('--- shot:', shot); }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
