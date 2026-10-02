/**
 * Memantau server MySQL selama uji beban (hanya baca): koneksi, thread aktif,
 * laju query, dan slow query tiap 5 detik ke load-tests/data/mysql-*.csv.
 *
 *   npx tsx --env-file=.env.loadtest scripts/loadtest-mysql-monitor.ts
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { createConnection, type RowDataPacket } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL wajib diisi.');
const file = `load-tests/data/mysql-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}.csv`;

const status = async (db: Awaited<ReturnType<typeof createConnection>>) => {
  const [rows] = await db.query<RowDataPacket[]>(
    `show global status where Variable_name in
     ('Threads_connected','Threads_running','Max_used_connections','Questions','Slow_queries','Aborted_connects')`,
  );
  return Object.fromEntries(rows.map((r) => [r.Variable_name, Number(r.Value)]));
};

async function main() {
  const db = await createConnection({ uri: url! });
  const [[max]] = await db.query<RowDataPacket[]>("show variables like 'max_connections'");
  console.log(`max_connections=${max.Value} -> ${file}`);
  writeFileSync(file, 'waktu,threads_connected,threads_running,max_used,query_per_s,slow_queries,koneksi_pylox_dn\n');
  let sebelum = await status(db);
  let t0 = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 5_000));
    const kini = await status(db);
    const [[proc]] = await db.query<RowDataPacket[]>("select count(*) n from information_schema.processlist where db = 'pylox_dn'");
    const detik = (Date.now() - t0) / 1000;
    const qps = ((kini.Questions - sebelum.Questions) / detik).toFixed(1);
    const baris = [new Date().toISOString(), kini.Threads_connected, kini.Threads_running, kini.Max_used_connections, qps, kini.Slow_queries, proc.n];
    appendFileSync(file, `${baris.join(',')}\n`);
    console.log(baris.join('  '));
    sebelum = kini;
    t0 = Date.now();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
