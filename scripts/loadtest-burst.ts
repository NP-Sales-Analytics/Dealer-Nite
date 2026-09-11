import { bacaSeededTarget, db, pastikanTrafficDiizinkan } from './loadtest-common';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const TAHAP = [10, 25, 50];

const kirim = (cookie: string) =>
  fetch(`${BASE}/api/order/adjust`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `pylox_session=${cookie}` },
    body: JSON.stringify({ qtyChange: 1 }),
  });

async function ringkas(sql: ReturnType<typeof db>, ids: string[]) {
  const [row] = await sql<{ rows: number; total: number }[]>`
    select count(*)::int as rows, coalesce(sum(qty_change), 0)::int as total
    from public.order_adjustments where customer_id in ${sql(ids)}`;
  return row;
}

async function main() {
  const target = bacaSeededTarget();
  pastikanTrafficDiizinkan(BASE, target.runId);
  const diperlukan = 100 + TAHAP.reduce((sum, n) => sum + n, 0);
  if (target.customers.length < diperlukan) {
    throw new Error(`Burst memerlukan minimal ${diperlukan} customer dummy.`);
  }
  const sql = db(2, target.runId);
  let cursor = 100;
  let lulus = true;

  try {
    console.log(`Run: ${target.runId}`);
    console.log(`Target: ${BASE}\n`);
    for (const jumlah of TAHAP) {
      const customers = target.customers.slice(cursor, cursor + jumlah);
      cursor += jumlah;
      const ids = customers.map((row) => row.id);
      const before = await ringkas(sql, ids);
      const started = Date.now();
      const responses = await Promise.all(customers.map((row) => kirim(row.cookie)));
      const duration = Date.now() - started;
      const statuses = new Map<number, number>();
      for (const response of responses) {
        statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
      }
      const after = await ringkas(sql, ids);
      const sukses = responses.filter((response) => response.status === 200).length;
      const tepat =
        sukses === jumlah &&
        after.rows - before.rows === jumlah &&
        after.total - before.total === jumlah;
      if (!tepat) lulus = false;

      console.log(`Burst ${jumlah}: ${tepat ? 'LULUS' : 'GAGAL'}`);
      console.log(`  status       : ${[...statuses].map(([s, n]) => `${s}x${n}`).join(' ')}`);
      console.log(`  ledger delta : ${after.rows - before.rows} baris / ${after.total - before.total} dus`);
      console.log(`  durasi       : ${duration} ms\n`);

      if (responses.some((response) => response.status === 402 || response.status >= 500)) {
        throw new Error('Stop condition: ditemukan 402 atau 5xx pada burst order.');
      }
      if (!tepat) break;
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    console.log(`HASIL: ${lulus ? 'LULUS' : 'GAGAL'}`);
    process.exitCode = lulus ? 0 : 1;
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
