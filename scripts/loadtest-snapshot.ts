import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import {
  ACTIVE_RUN_FILE,
  DATA_DIR,
  type ActiveRun,
  bacaActiveRun,
  buatRunId,
  db,
  pastikanRunId,
  tulisActiveRun,
  tulisJson,
} from './loadtest-common';

const TABEL = ['customers', 'profiles', 'reservations', 'order_adjustments', 'app_settings'] as const;
type Tabel = (typeof TABEL)[number];
type Baris = Record<string, unknown>;
type Ringkasan = Record<Tabel, { count: number; hashes: string[] }>;
type Snapshot = { version: 2; runId: string; dibuat: string; tables: Ringkasan };

function hashBaris(row: Baris) {
  const stabil = Object.fromEntries(Object.entries(row).sort(([a], [b]) => a.localeCompare(b)));
  return createHash('sha256').update(JSON.stringify(stabil)).digest('hex');
}

async function ringkas(sql: ReturnType<typeof db>): Promise<Ringkasan> {
  const hasil = {} as Ringkasan;
  for (const table of TABEL) {
    const rows = (await sql`select * from public.${sql(table)}`) as unknown as Baris[];
    hasil[table] = { count: rows.length, hashes: rows.map(hashBaris).sort() };
  }
  return hasil;
}

async function main() {
  const banding = process.argv.includes('--banding');

  if (banding) {
    const active = bacaActiveRun();
    if (active.status !== 'cleaned') {
      throw new Error(`Banding akhir hanya boleh setelah cleanup; status saat ini ${active.status}.`);
    }
    const sql = db(1, active.runId);
    try {
      if (!existsSync(active.snapshotFile)) throw new Error(`Snapshot hilang: ${active.snapshotFile}`);
      const awal = JSON.parse(readFileSync(active.snapshotFile, 'utf8')) as Snapshot;
      const sekarang = await ringkas(sql);
      let lulus = true;

      console.log(`Run ${active.runId}; membandingkan dengan ${active.snapshotFile}\n`);
      for (const table of TABEL) {
        const a = awal.tables[table];
        const b = sekarang[table];
        const sama = a.count === b.count && JSON.stringify(a.hashes) === JSON.stringify(b.hashes);
        if (!sama) lulus = false;
        console.log(
          `  [${sama ? 'LULUS' : 'GAGAL'}] ${table.padEnd(18)} awal=${a.count} sekarang=${b.count}`,
        );
      }
      console.log(`\nHASIL: ${lulus ? 'BERSIH - data non-test identik' : 'BELUM BERSIH'}`);
      process.exitCode = lulus ? 0 : 1;
      return;
    } finally {
      await sql.end();
    }
  }

  if (existsSync(ACTIVE_RUN_FILE)) {
    const lama = bacaActiveRun();
    if (lama.status !== 'cleaned') {
      throw new Error(`Run ${lama.runId} masih berstatus ${lama.status}; cleanup dulu sebelum run baru.`);
    }
  }

  const runId = pastikanRunId(process.env.LOADTEST_RUN_ID ?? buatRunId());
  const snapshotFile = `${DATA_DIR}/snapshot-hash-${runId}.json`;
  const sql = db(1, runId);
  try {
    const snapshot: Snapshot = {
      version: 2,
      runId,
      dibuat: new Date().toISOString(),
      tables: await ringkas(sql),
    };
    tulisJson(snapshotFile, snapshot);
    const active: ActiveRun = {
      version: 2,
      runId,
      dibuat: snapshot.dibuat,
      status: 'snapshotted',
      snapshotFile,
    };
    tulisActiveRun(active);
    console.log(`Run ID: ${runId}`);
    console.log(`Snapshot hash: ${snapshotFile}`);
    for (const table of TABEL) console.log(`  ${table.padEnd(18)} ${snapshot.tables[table].count} baris`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
