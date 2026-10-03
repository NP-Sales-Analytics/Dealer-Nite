import { afterAll, describe, expect, it } from 'vitest';
import { connectionOptions, mysqlPool } from '@/lib/db';

afterAll(() => mysqlPool.end());

// CURRENT_TIMESTAMP (default checked_in_at, created_at, verified_at) mengikuti
// zona sesi; server ber-zona WIB membuat check-in 17.26 tampil 00.26.
it.skipIf(!process.env.DATABASE_URL)('locks every pooled MySQL session to UTC', async () => {
  const [rows] = await mysqlPool.query('select @@session.time_zone as tz, now(3) = utc_timestamp(3) as utc');
  expect(rows).toEqual([{ tz: '+00:00', utc: 1 }]);
});

describe('MySQL connection options', () => {
  it('uses the configured CA without disabling TLS verification', () => {
    const options = connectionOptions(
      'mysql://app:secret@db.example.com:3306/dealer_nite',
      true,
      '-----BEGIN CERTIFICATE-----\\nCA\\n-----END CERTIFICATE-----',
    );

    expect(options.ssl).toEqual({
      ca: '-----BEGIN CERTIFICATE-----\nCA\n-----END CERTIFICATE-----',
    });
  });
});
