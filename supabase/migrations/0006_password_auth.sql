-- Auth pindah dari Supabase Auth (email+password) ke sesi cookie custom dengan
-- login "password saja" untuk tim dan kode_sap untuk customer. Lihat lib/auth.ts,
-- lib/session.ts, lib/password.ts.

alter table public.profiles
  -- Hash password tim (HMAC+pepper). UNIK: password adalah pengenal saat login.
  add column if not exists password_hash text,
  -- Email tidak lagi kredensial, jadi boleh kosong.
  alter column email drop not null,
  -- id tidak lagi mengacu auth.users; dibuat sendiri.
  alter column id set default gen_random_uuid();

-- Lepas ketergantungan ke auth.users (baris lama tetap memakai id yang sudah ada).
alter table public.profiles drop constraint if exists profiles_id_fkey;

-- Postgres mengizinkan banyak NULL di unique index, jadi user tanpa password
-- (mis. baris customer lama) tidak saling bentrok.
create unique index if not exists profiles_password_hash_key on public.profiles(password_hash);

-- Trigger pengisi profil dari auth.users tidak relevan lagi; user dibuat langsung.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Jejak audit: staff yang mencatatkan order atas nama toko (null = self-service).
alter table public.order_adjustments add column if not exists recorded_by uuid;
