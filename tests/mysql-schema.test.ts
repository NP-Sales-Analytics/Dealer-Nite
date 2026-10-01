import { createPool, type RowDataPacket } from 'mysql2/promise';
import { describe, expect, it } from 'vitest';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('MySQL schema', () => {
  it('creates all Dealer Nite tables', async () => {
    const pool = createPool(url!);
    try {
      const [tables] = await pool.query<(RowDataPacket & { TABLE_NAME: string })[]>(
        `select table_name as TABLE_NAME
         from information_schema.tables
         where table_schema = database()`,
      );

      expect(tables.map((row) => row.TABLE_NAME)).toEqual(expect.arrayContaining([
        'dealer_nights',
        'profiles',
        'customers',
        'target_adjustments',
        'reservations',
        'app_settings',
      ]));
    } finally {
      await pool.end();
    }
  });
});
