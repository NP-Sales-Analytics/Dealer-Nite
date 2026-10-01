import { sql } from 'drizzle-orm';
import { bigint, boolean, date, datetime, int, json, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const dealerNights = mysqlTable('dealer_nights', {
  id: varchar('id', { length: 36 }).primaryKey(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  active: boolean('active').notNull().default(true),
  targetPax: int('target_pax').notNull().default(0),
  targetDn: bigint('target_dn', { mode: 'number' }).notNull().default(0),
  eventDate: date('event_date', { mode: 'string' }),
  depotCodes: json('depot_codes').$type<string[] | null>(),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
});
