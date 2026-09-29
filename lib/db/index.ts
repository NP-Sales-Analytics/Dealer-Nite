import { drizzle } from 'drizzle-orm/mysql2';
import { createPool, type PoolOptions } from 'mysql2/promise';
import * as schema from './schema';

function connectionOptions(raw = process.env.DATABASE_URL): PoolOptions {
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
    waitForConnections: true,
    queueLimit: 0,
    timezone: 'Z',
    enableKeepAlive: true,
    ...(process.env.DB_SSL === '1' ? { ssl: {} } : {}),
  };
}

export const mysqlPool = createPool(connectionOptions());
export const db = drizzle(mysqlPool, { schema, mode: 'default' });
