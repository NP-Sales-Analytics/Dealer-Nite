import { sql } from 'drizzle-orm';
import {
  boolean,
  datetime,
  json,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

export const roles = ['superadmin', 'admin', 'marketing', 'management', 'dn_user'] as const;
export type DbRole = (typeof roles)[number];

export const profiles = mysqlTable('profiles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }),
  fullName: varchar('full_name', { length: 200 }).notNull().default(''),
  passwordHash: varchar('password_hash', { length: 64 }),
  role: mysqlEnum('role', roles).notNull().default('dn_user'),
  allowedPages: json('allowed_pages').$type<string[]>().notNull(),
  // NULL = semua Dealer Night; superadmin selalu semua.
  dealerNightIds: json('dealer_night_ids').$type<string[] | null>(),
  // NULL = semua depot di Dealer Night yang diizinkan.
  depotCodes: json('depot_codes').$type<string[] | null>(),
  bolehUnduh: boolean('boleh_unduh').notNull().default(false),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP(3)`),
}, (table) => [
  uniqueIndex('profiles_password_hash_unique').on(table.passwordHash),
]);
