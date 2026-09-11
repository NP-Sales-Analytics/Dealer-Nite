import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import postgres from 'postgres';

/** Project Supabase produksi. Tidak boleh tersentuh tanpa dua konfirmasi eksplisit. */
const REF_PRODUKSI = 'gmlnoqghnkkgbgixkpvv';

export const DATA_DIR = 'load-tests/data';
export const ACTIVE_RUN_FILE = `${DATA_DIR}/active-run.json`;
export const TARGET_FILE = `${DATA_DIR}/target.json`;
export const READONLY_TARGET_FILE = `${DATA_DIR}/target-readonly.json`;

const RUN_ID_RE = /^LOADTEST_\d{8}T\d{6}Z_[A-F0-9]{6}$/;

export type TargetCustomer = {
  id: string;
  kodeSap: string;
  namaToko: string;
  cookie: string;
};

export type TargetStaff = {
  id: string;
  fullName: string;
  cookie: string;
};

export type SeededTarget = {
  version: 2;
  mode: 'seeded';
  runId: string;
  dibuat: string;
  staff: TargetStaff[];
  customers: TargetCustomer[];
};

export type ReadOnlyTarget = {
  version: 2;
  mode: 'read-only';
  dibuat: string;
  staff: { id: string; cookie: string }[];
  customers: { id: string; kodeSap: string; cookie: string }[];
};

export type ActiveRun = {
  version: 2;
  runId: string;
  dibuat: string;
  status: 'snapshotted' | 'seeding' | 'seeded' | 'cleaned';
  snapshotFile: string;
};

export function buatRunId(now = new Date()) {
  const waktu = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `LOADTEST_${waktu}_${randomBytes(3).toString('hex').toUpperCase()}`;
}

export function pastikanRunId(runId: string) {
  if (!RUN_ID_RE.test(runId)) {
    throw new Error(
      `Run ID tidak valid: ${runId}. Format wajib LOADTEST_YYYYMMDDTHHMMSSZ_A1B2C3.`,
    );
  }
  return runId;
}

export const kodeCustomer = (runId: string, index: number) =>
  `${pastikanRunId(runId)}_C_${String(index).padStart(4, '0')}`;

export const namaCustomer = (runId: string, index: number) =>
  `${pastikanRunId(runId)} TOKO ${String(index).padStart(4, '0')}`;

export const namaStaff = (runId: string, index: number) =>
  `${pastikanRunId(runId)} STAFF ${String(index).padStart(3, '0')}`;

export function tulisJson(path: string, value: unknown) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
}

export function bacaActiveRun(): ActiveRun {
  if (!existsSync(ACTIVE_RUN_FILE)) {
    throw new Error(`Tidak ada ${ACTIVE_RUN_FILE}. Jalankan loadtest:snapshot lebih dulu.`);
  }
  const active = JSON.parse(readFileSync(ACTIVE_RUN_FILE, 'utf8')) as ActiveRun;
  if (active.version !== 2) throw new Error('Format active-run lama tidak didukung.');
  pastikanRunId(active.runId);
  return active;
}

export function bacaSeededTarget(): SeededTarget {
  if (!existsSync(TARGET_FILE)) {
    throw new Error(`Tidak ada ${TARGET_FILE}. Jalankan loadtest:seed lebih dulu.`);
  }
  const target = JSON.parse(readFileSync(TARGET_FILE, 'utf8')) as SeededTarget;
  if (target.version !== 2 || target.mode !== 'seeded') {
    throw new Error('target.json bukan manifest seeded v2; data produksi tidak boleh ditulis.');
  }
  pastikanRunId(target.runId);
  const active = bacaActiveRun();
  if (active.runId !== target.runId) {
    throw new Error(`Run aktif ${active.runId} tidak cocok dengan manifest ${target.runId}.`);
  }
  return target;
}

export function tulisActiveRun(active: ActiveRun) {
  pastikanRunId(active.runId);
  tulisJson(ACTIVE_RUN_FILE, active);
}

/**
 * Guard produksi berlapis. Variabel sengaja panjang dan nilainya terkait run ID,
 * sehingga file env lama tidak dapat tanpa sengaja mengizinkan run baru.
 */
export function databaseUrl(runId?: string): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum diset.');

  if (url.includes(REF_PRODUKSI)) {
    if (process.env.IZINKAN_PRODUKSI !== '1') {
      throw new Error('DITOLAK: database produksi memerlukan IZINKAN_PRODUKSI=1.');
    }
    if (runId && process.env.KONFIRMASI_RUN_PRODUKSI !== runId) {
      throw new Error(
        `DITOLAK: set KONFIRMASI_RUN_PRODUKSI=${runId} untuk mengizinkan run ini saja.`,
      );
    }
    console.warn('!! Database PRODUKSI aktif; guard run-spesifik telah diverifikasi.');
  }
  return url;
}

/** Guard terpisah untuk traffic HTTP/WebSocket ke domain produksi. */
export function pastikanTrafficDiizinkan(baseUrl: string, runId: string) {
  pastikanRunId(runId);
  const target = new URL(baseUrl);
  if (target.hostname !== 'pylox.bi-nipponpaint.com') return target.origin;

  if (process.env.IZINKAN_PRODUKSI !== '1') {
    throw new Error('DITOLAK: traffic produksi memerlukan IZINKAN_PRODUKSI=1.');
  }
  if (process.env.KONFIRMASI_RUN_PRODUKSI !== runId) {
    throw new Error(`DITOLAK: KONFIRMASI_RUN_PRODUKSI harus sama dengan ${runId}.`);
  }
  if (process.env.OBSERVABILITY_SIAP !== '1') {
    throw new Error('DITOLAK: observability Supabase dan Vercel belum dikonfirmasi siap.');
  }
  if (process.env.TIM_SUDAH_DIBERI_TAHU !== '1') {
    throw new Error('DITOLAK: tim operasional belum dikonfirmasi telah diberi tahu.');
  }
  return target.origin;
}

export function db(max = 4, runId?: string) {
  return postgres(databaseUrl(runId), { prepare: false, max });
}
