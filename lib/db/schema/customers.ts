import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  wilayah: text('wilayah'),
  region: text('region'),
  depot: text('depot'),
  picRsmAsm: text('pic_rsm_asm'),
  namaToko: text('nama_toko').notNull(),
  namaPemilik: text('nama_pemilik'),
  kodeSap: text('kode_sap').notNull().unique(),
  qtyUndangan: integer('qty_undangan').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
