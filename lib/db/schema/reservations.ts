import { sql } from 'drizzle-orm';
import {
  boolean,
  datetime,
  index,
  int,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { customers } from './customers';
import { dealerNights } from './dealer-nights';
import { profiles } from './profiles';

export const reservations = mysqlTable('reservations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  dealerNightId: varchar('dealer_night_id', { length: 36 })
    .notNull()
    .references(() => dealerNights.id, { onDelete: 'cascade' }),
  customerId: varchar('customer_id', { length: 36 })
    .references(() => customers.id, { onDelete: 'cascade' }),
  isManualEntry: boolean('is_manual_entry').notNull().default(false),
  manualNamaCustomer: varchar('manual_nama_customer', { length: 200 }),
  manualDepot: varchar('manual_depot', { length: 120 }),
  depotOverride: varchar('depot_override', { length: 120 }),
  qtyHadir: int('qty_hadir').notNull(),
  checkedInBy: varchar('checked_in_by', { length: 36 })
    .references(() => profiles.id, { onDelete: 'set null' }),
  checkedInAt: datetime('checked_in_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  uniqueIndex('reservations_customer_unique').on(table.customerId),
  index('reservations_dn_idx').on(table.dealerNightId),
  index('reservations_checked_in_at_idx').on(table.checkedInAt),
]);
