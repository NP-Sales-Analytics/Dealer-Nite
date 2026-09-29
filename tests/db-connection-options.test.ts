import { describe, expect, it } from 'vitest';
import { connectionOptions } from '@/lib/db';

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
