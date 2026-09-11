import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { bacaSeededTarget } from './loadtest-common';

const SCENARIOS = new Set([
  'leaderboard-read',
  'order-adjust',
  'search',
  'checkin',
  'staff-mixed',
]);

const [scenario, ...flags] = process.argv.slice(2);
if (!scenario || !SCENARIOS.has(scenario)) {
  throw new Error(`Skenario wajib salah satu: ${[...SCENARIOS].join(', ')}`);
}
if (flags.some((flag) => flag !== '--baseline' && flag !== '--short')) {
  throw new Error('Flag yang didukung hanya --baseline atau --short.');
}

let runId = process.env.LOADTEST_RUN_ID;
try {
  runId = bacaSeededTarget().runId;
} catch {
  // leaderboard read-only boleh memakai TARGET_FILE lain dan tidak menulis data.
}
const suffix = runId ?? new Date().toISOString().replace(/[:.]/g, '-');
const report = `load-tests/data/report-k6-${scenario}-${suffix}.json`;
const script = `load-tests/scenarios/${scenario}.js`;
if (!existsSync(script)) throw new Error(`Skenario tidak ditemukan: ${script}`);

const env = { ...process.env };
if (flags.includes('--baseline')) env.BASELINE = '1';
if (flags.includes('--short')) env.SINGKAT = '1';

const result = spawnSync('k6', ['run', '--summary-export', report, script], {
  env,
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Laporan k6: ${report}`);
