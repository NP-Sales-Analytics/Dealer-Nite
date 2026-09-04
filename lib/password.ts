import { createHmac } from 'node:crypto';

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET belum diset');
  return s;
}

/**
 * Hash password tim untuk login "password saja".
 *
 * Deterministik (HMAC-SHA256 + pepper AUTH_SECRET), bukan bcrypt: di sini password
 * SEKALIGUS pengenal user - login mencarinya lewat kolom ini, dan keunikannya
 * dijaga unique index. Salt per-user (bcrypt) membuat lookup maupun cek-duplikat
 * mustahil. Pemanggil sudah men-trim di boundary (login + form user), jadi spasi
 * tak sengaja tidak bikin gagal cocok.
 *
 * ponytail: HMAC+pepper cukup untuk tool event internal. Kalau kelak perlu tahan
 * bocor DB, naikkan ke argon2 + salt + kolom lookup terpisah.
 */
export function hashPassword(password: string): string {
  return createHmac('sha256', secret()).update(password).digest('hex');
}
