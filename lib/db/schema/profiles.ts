import { boolean, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', [
  'superadmin', 'admin_rsvp', 'marketing', 'rsm', 'customer',
]);

export const profiles = pgTable('profiles', {
  // Sejak auth pindah dari Supabase Auth ke sesi custom, id tidak lagi mengacu ke
  // auth.users - dibuat sendiri di DB.
  id: uuid('id').primaryKey().defaultRandom(),
  // Email kini opsional (info kontak), BUKAN kredensial. Login tim pakai password.
  email: text('email'),
  fullName: text('full_name').notNull().default(''),
  // Password tim di-hash (HMAC+pepper, lihat lib/password.ts) dan UNIK - inilah
  // kredensial sekaligus pengenal saat login "password saja".
  passwordHash: text('password_hash'),
  role: userRole('role').notNull().default('customer'),
  // Lihat supabase/migrations/0004_user_access.sql untuk arti kedua kolom ini.
  allowedPages: text('allowed_pages').array().notNull().default([]),
  dataScope: text('data_scope'),
  // Izin mengunduh Excel, terpisah dari izin membuka halamannya - berkas yang
  // sudah terunduh tidak bisa ditarik kembali. Lihat 0009_boleh_unduh.sql.
  bolehUnduh: boolean('boleh_unduh').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
