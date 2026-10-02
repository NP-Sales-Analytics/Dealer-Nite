import { sql } from 'drizzle-orm';
import { bigint, datetime, index, int, mysqlEnum, mysqlTable, text, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { customers } from './customers';
import { dealerNights } from './dealer-nights';
import { profiles } from './profiles';

export const targetAdjustments = mysqlTable('target_adjustments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 })
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  dealerNightId: varchar('dealer_night_id', { length: 36 })
    .notNull()
    .references(() => dealerNights.id, { onDelete: 'cascade' }),
  // Nomor formulir fisik, berurutan per Dealer Night; NULL = belum dicatat.
  noFormulir: int('no_formulir'),
  delta: bigint('delta', { mode: 'number' }).notNull(),
  jenis: mysqlEnum('jenis', ['verifikasi', 'penyesuaian']).notNull().default('penyesuaian'),
  note: text('note'),
  recordedBy: varchar('recorded_by', { length: 36 })
    .references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('target_adjustments_customer_idx').on(table.customerId),
  uniqueIndex('target_adjustments_dn_form_unique').on(table.dealerNightId, table.noFormulir),
  index('target_adjustments_created_at_idx').on(table.createdAt),
]);
