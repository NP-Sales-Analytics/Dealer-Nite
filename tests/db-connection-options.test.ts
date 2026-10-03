import { afterAll, describe, expect, it } from 'vitest';
import { connectionOptions, mysqlPool } from '@/lib/db';
import { isoUtc } from '@/lib/utils';

// Teks DATETIME mentah harus dibaca sebagai UTC, apa pun zona mesin yang menjalankan.
it('reads raw MySQL DATETIME text as UTC regardless of the host time zone', () => {
  expect(isoUtc('2026-10-03 12:57:01.123')).toBe('2026-10-03T12:57:01.123Z');
  expect(isoUtc(null)).toBeNull();
});

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
