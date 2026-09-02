import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { customers } from './customers';

export const reservations = pgTable('reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  isManualEntry: boolean('is_manual_entry').notNull().default(false),
  manualNamaCustomer: text('manual_nama_customer'),
  manualDepot: text('manual_depot'),
  // Koreksi depot khusus catatan ini; master data SAP tidak tersentuh.
  // Urutan pemakaian: depotOverride -> customers.depot -> manualDepot.
  depotOverride: text('depot_override'),
  qtyHadir: integer('qty_hadir').notNull(),
  checkedInBy: uuid('checked_in_by'),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }).notNull().defaultNow(),
});
