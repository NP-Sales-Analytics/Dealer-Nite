import { bigint, index, mysqlTable, smallint, uniqueIndex, varchar } from 'drizzle-orm/mysql-core';
import { customers } from './customers';

/** Sold To Party milik satu MG; urutan 1 = SOTP utama (disalin ke customers.sotp_*). */
export const customerSotp = mysqlTable('customer_sotp', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  customerId: varchar('customer_id', { length: 36 })
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  urutan: smallint('urutan').notNull(),
  sotpCode: varchar('sotp_code', { length: 32 }).notNull(),
  sotpName: varchar('sotp_name', { length: 200 }).notNull(),
}, (table) => [
  uniqueIndex('customer_sotp_kode_unique').on(table.customerId, table.sotpCode),
  index('customer_sotp_urutan_idx').on(table.customerId, table.urutan),
]);
