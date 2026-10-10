import { sql } from 'drizzle-orm';
import { bigint, boolean, date, datetime, int, json, mysqlEnum, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

export const dealerNights = mysqlTable('dealer_nights', {
  id: varchar('id', { length: 36 }).primaryKey(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  active: boolean('active').notNull().default(true),
  targetPax: int('target_pax').notNull().default(0),
  targetDn: bigint('target_dn', { mode: 'number' }).notNull().default(0),
  // Target DN minimal per toko di DN ini.
  minTargetDn: bigint('min_target_dn', { mode: 'number' }).notNull().default(50_000_000),
  formTerakhir: int('form_terakhir').notNull().default(0),
  eventDate: date('event_date', { mode: 'string' }),
  depotCodes: json('depot_codes').$type<string[] | null>(),
  // Warna fisik kupon (Indonesia Timur: putih/kuning) dan nilai pembaginya per DN.
  kuponSkema: mysqlEnum('kupon_skema', ['pink_hijau', 'putih_kuning']).notNull().default('pink_hijau'),
  nilaiKuponPink: bigint('nilai_kupon_pink', { mode: 'number' }).notNull().default(100_000_000),
  nilaiKuponHijau: bigint('nilai_kupon_hijau', { mode: 'number' }).notNull().default(25_000_000),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
});
