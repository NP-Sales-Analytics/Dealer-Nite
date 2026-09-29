import { sql } from 'drizzle-orm';
import { datetime, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';

export const appSettings = mysqlTable('app_settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
});
