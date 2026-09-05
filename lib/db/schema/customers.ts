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
  // Pengambilan dus yang pertama kali tercatat - jadi lantai permanen di
  // Tambah Order. NULL = belum pernah mengambil. Lihat 0007_detail_order.sql.
  dusAwal: integer('dus_awal'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
