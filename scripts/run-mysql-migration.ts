import { readFileSync } from 'node:fs';
import { createConnection } from 'mysql2/promise';

function envName() {
  const index = process.argv.indexOf('--url-env');
  return index >= 0 ? process.argv[index + 1] : 'DATABASE_URL';
}

async function main() {
  const key = envName();
  if (!key) throw new Error('Nama environment setelah --url-env wajib diisi.');
  const url = process.env[key];
  if (!url) throw new Error(`${key} belum diset.`);

  const connection = await createConnection({ uri: url, multipleStatements: true });
  try {
    const migration = readFileSync('mysql/migrations/0001_init.sql', 'utf8');
    await connection.query(migration);
    console.log('Migrasi MySQL selesai.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
