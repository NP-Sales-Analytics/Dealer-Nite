import { readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
const EXE = path.join(process.env.LOCALAPPDATA!, 'ms-playwright', 'chromium-1208', 'chrome-win64', 'chrome.exe');

async function main() {
  const jar = readFileSync('cookies.txt', 'utf8').split(/\r?\n/).filter((l) => l && !l.startsWith('#'));
  const cookies = jar.map((l) => { const f = l.split('\t'); return { name: f[5], value: f[6], domain: 'localhost', path: '/' }; });
  const b = await chromium.launch({ executablePath: EXE });
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await ctx.addCookies(cookies);
  const p = await ctx.newPage();
  await p.goto(process.argv[2], { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);

  const report = await p.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out: string[] = [`viewport=${vw} scrollWidth=${document.documentElement.scrollWidth}`];
    document.querySelectorAll<HTMLElement>('*').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > vw + 1) {
        const id = el.tagName.toLowerCase()
          + (el.className && typeof el.className === 'string' ? '.' + el.className.split(/\s+/).slice(0, 3).join('.') : '');
        out.push(`${Math.round(r.width)}px  ${id.slice(0, 110)}`);
      }
    });
    return out.slice(0, 14).join('\n');
  });
  console.log(report);
  await b.close();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
