import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type PoolOptions } from 'mysql2/promise';
import * as schema from './schema';

export function connectionOptions(
  raw = process.env.DATABASE_URL,
  sslEnabled = process.env.DB_SSL === '1',
  sslCa = process.env.DB_SSL_CA,
): PoolOptions {
  if (!raw) {
    if (process.env.NODE_ENV === 'test') {
      return {
        host: '127.0.0.1',
        port: 3306,
        user: 'invalid',
        password: 'invalid',
        database: 'invalid',
      };
    }
    throw new Error('DATABASE_URL belum diset');
  }

  const url = new URL(raw);
  if (url.protocol !== 'mysql:') throw new Error('DATABASE_URL wajib memakai protokol mysql://');
  const database = url.pathname.replace(/^\//, '');
  if (!database) throw new Error('DATABASE_URL wajib menyertakan nama database');

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    connectionLimit: 5,
    // Server MySQL dipakai bersama aplikasi lain (max_connections 151). Tanpa
    // ini tiap instance serverless menahan 5 koneksi menganggur selamanya;
    // uji 100 VU menyisakan ~50 koneksi diam setelah beban selesai.
    maxIdle: 1,
    idleTimeout: 15_000,
    waitForConnections: true,
    queueLimit: 0,
    timezone: 'Z',
    enableKeepAlive: true,
    ...(sslEnabled ? { ssl: sslCa ? { ca: sslCa.replace(/\\n/g, '\n') } : {} } : {}),
  };
}

export const mysqlPool = createPool(connectionOptions());
export const db = drizzle(mysqlPool, { schema, mode: 'default' });
