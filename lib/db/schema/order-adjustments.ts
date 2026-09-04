import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers';

export const orderAdjustments = pgTable('order_adjustments', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  qtyChange: integer('qty_change').notNull(),
  note: text('note'),
  // Staff yang mencatatkan atas nama toko; null = customer self-service.
  recordedBy: uuid('recorded_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
