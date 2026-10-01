import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createConnection, type RowDataPacket } from 'mysql2/promise';

const DIR = 'mysql/migrations';

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
    await connection.query(`create table if not exists schema_migrations (
      name varchar(200) primary key,
      applied_at datetime(3) not null default current_timestamp(3)
    ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci`);
    const [rows] = await connection.query<(RowDataPacket & { name: string })[]>('select name from schema_migrations');
    const applied = new Set(rows.map((row) => row.name));

    const files = readdirSync(DIR).filter((file) => file.endsWith('.sql')).sort();
    for (const file of files) {
      if (applied.has(file)) continue;
      // DDL MySQL auto-commit, jadi migrasi tidak bisa di-rollback: backup dulu.
      await connection.query(readFileSync(path.join(DIR, file), 'utf8'));
      await connection.query('insert into schema_migrations (name) values (?)', [file]);
      console.log(`Diterapkan: ${file}`);
    }
    console.log('Migrasi MySQL selesai.');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
