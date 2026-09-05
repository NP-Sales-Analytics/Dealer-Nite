import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Setelan aplikasi berbentuk key-value. Sengaja generik supaya setelan
 * berikutnya tidak perlu tabel baru. Saat ini hanya 'order_deadline'.
 */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
