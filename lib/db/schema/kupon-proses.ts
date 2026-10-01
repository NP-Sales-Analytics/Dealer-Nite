import { sql } from 'drizzle-orm';
import { datetime, index, int, mysqlEnum, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { customers } from './customers';
import { dealerNights } from './dealer-nights';
import { profiles } from './profiles';

export const kuponProses = mysqlTable('kupon_proses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  dealerNightId: varchar('dealer_night_id', { length: 36 })
    .notNull()
    .references(() => dealerNights.id, { onDelete: 'cascade' }),
  customerId: varchar('customer_id', { length: 36 })
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  tahap: mysqlEnum('tahap', ['dibuat', 'diberikan']).notNull(),
  pink: int('pink').notNull().default(0),
  hijau: int('hijau').notNull().default(0),
  penerima: varchar('penerima', { length: 200 }),
  catatan: text('catatan'),
  recordedBy: varchar('recorded_by', { length: 36 })
    .references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('kupon_proses_customer_idx').on(table.customerId),
  index('kupon_proses_dn_idx').on(table.dealerNightId, table.createdAt),
]);
