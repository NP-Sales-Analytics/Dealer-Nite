import { sql } from 'drizzle-orm';
import { bigint, datetime, index, mysqlTable, text, varchar } from 'drizzle-orm/mysql-core';
import { customers } from './customers';
import { profiles } from './profiles';

export const targetAdjustments = mysqlTable('target_adjustments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 })
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  delta: bigint('delta', { mode: 'number' }).notNull(),
  note: text('note'),
  recordedBy: varchar('recorded_by', { length: 36 })
    .references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  index('target_adjustments_customer_idx').on(table.customerId),
  index('target_adjustments_created_at_idx').on(table.createdAt),
]);
