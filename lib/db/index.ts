import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Supavisor transaction mode tidak mendukung prepared statement.
// max:1 karena tiap lambda Vercel adalah proses terpisah.
const client = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });

export const db = drizzle(client, { schema });
