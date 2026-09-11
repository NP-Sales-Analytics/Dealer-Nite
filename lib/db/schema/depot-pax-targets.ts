import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Target maksimum pax per depot untuk dashboard kehadiran. */
export const depotPaxTargets = pgTable('depot_pax_targets', {
  depot: text('depot').primaryKey(),
  wilayah: text('wilayah'),
  region: text('region'),
  targetPax: integer('target_pax').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

