import { sql } from 'drizzle-orm';
import { boolean, datetime, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const dealerNights = mysqlTable('dealer_nights', {
  id: varchar('id', { length: 36 }).primaryKey(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
});
