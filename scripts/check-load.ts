import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';

function cookieHeader() {
  const file = process.env.COOKIE_FILE ?? 'cookies.txt';
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => { const f = l.split('\t'); return `${f[5]}=${f[6]}`; })
    .join('; ');
}

async function serentak(jalur: string, n: number, cookie: string) {
  const mulai = Date.now();
  const waktu = await Promise.all(
    Array.from({ length: n }, async () => {
      const a = Date.now();
      const r = await fetch(BASE + jalur, { headers: { cookie } });
      await r.text();
      return { ms: Date.now() - a, status: r.status };
    }),
  );
  const total = Date.now() - mulai;
  const ms = waktu.map((w) => w.ms).sort((a, b) => a - b);
  const salah = waktu.filter((w) => w.status !== 200).length;
  return {
    total,
    p50: ms[Math.floor(n * 0.5)],
    p95: ms[Math.floor(n * 0.95)],
    max: ms[n - 1],
    salah,
  };
}

async function main() {
  const cookie = cookieHeader();
  console.log('jalur                              n    total    p50    p95    max   gagal');
  for (const jalur of ['/api/dashboard/recent?page=1', '/api/dashboard/summary']) {
    for (const n of [10, 30, 60]) {
      const r = await serentak(jalur, n, cookie);
      console.log(
        jalur.padEnd(32),
        String(n).padStart(3),
        String(r.total + 'ms').padStart(8),
        String(r.p50 + 'ms').padStart(6),
        String(r.p95 + 'ms').padStart(6),
        String(r.max + 'ms').padStart(6),
        String(r.salah).padStart(6),
      );
    }
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
