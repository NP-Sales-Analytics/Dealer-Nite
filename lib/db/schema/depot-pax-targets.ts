import { sql } from 'drizzle-orm';
import { datetime, index, int, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { dealerNights } from './dealer-nights';

export const depotPaxTargets = mysqlTable('depot_pax_targets', {
  id: varchar('id', { length: 36 }).primaryKey(),
  dealerNightId: varchar('dealer_night_id', { length: 36 })
    .notNull()
    .references(() => dealerNights.id, { onDelete: 'cascade' }),
  depotCode: varchar('depot_code', { length: 20 }).notNull(),
  depotName: varchar('depot_name', { length: 120 }).notNull(),
  wilayah: varchar('wilayah', { length: 120 }),
  region: varchar('region', { length: 40 }),
  targetPax: int('target_pax').notNull().default(0),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  uniqueIndex('depot_pax_targets_dn_depot_unique').on(table.dealerNightId, table.depotCode),
  index('depot_pax_targets_dn_idx').on(table.dealerNightId),
]);
