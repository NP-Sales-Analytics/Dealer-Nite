import { sql } from 'drizzle-orm';
import {
  bigint,
  datetime,
  index,
  int,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { dealerNights } from './dealer-nights';

export const customers = mysqlTable('customers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  dealerNightId: varchar('dealer_night_id', { length: 36 })
    .notNull()
    .references(() => dealerNights.id, { onDelete: 'cascade' }),
  mgCode: varchar('mg_code', { length: 32 }).notNull(),
  mgName: varchar('mg_name', { length: 200 }).notNull(),
  sotpCode: varchar('sotp_code', { length: 32 }).notNull(),
  sotpName: varchar('sotp_name', { length: 200 }).notNull(),
  depotCode: varchar('depot_code', { length: 20 }).notNull(),
  depotName: varchar('depot_name', { length: 120 }).notNull(),
  wilayah: varchar('wilayah', { length: 120 }),
  region: varchar('region', { length: 40 }),
  salesman: varchar('salesman', { length: 200 }),
  spv: varchar('spv', { length: 200 }),
  targetDnAwal: bigint('target_dn_awal', { mode: 'number' }).notNull(),
  qtyUndangan: int('qty_undangan').notNull().default(1),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  uniqueIndex('customers_dn_mg_unique').on(table.dealerNightId, table.mgCode),
  index('customers_dn_idx').on(table.dealerNightId),
  index('customers_depot_idx').on(table.depotCode),
]);
