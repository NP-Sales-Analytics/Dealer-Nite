-- Kontrol akses per-user: halaman apa yang boleh dibuka, dan data siapa yang
-- boleh dilihat.
--
-- Sebelumnya role sekaligus menentukan keduanya secara implisit di dalam kode.
-- Itu cukup selama tiap role hanya punya satu bentuk, tapi tidak lagi begitu
-- ketika ada dua RSM yang harus melihat region berbeda. Karena itu keduanya
-- dipisah jadi kolom sendiri: role tetap ada sebagai preset, tapi yang
-- ditegakkan adalah isi kolomnya.

-- 'marketing' hanya memantau, seperti RSM, tapi tanpa batas region.
--
-- CATATAN: ADD VALUE tidak boleh dipakai di transaksi yang sama dengan
-- pemakaiannya. Migrasi ini hanya menambah kolom, jadi aman; kalau nanti ada
-- migrasi yang meng-INSERT baris ber-role 'marketing', jalankan terpisah.
alter type public.user_role add value if not exists 'marketing';

alter table public.profiles
  -- Daftar path halaman, misal '{/dashboard,/kehadiran}'. Kosong berarti belum
  -- diatur, dan kode jatuh ke preset bawaan role - bukan berarti tanpa akses,
  -- supaya user lama tidak mendadak terkunci setelah migrasi ini.
  add column if not exists allowed_pages text[] not null default '{}',
  -- Cakupan data. Artinya bergantung role: region untuk RSM ('3A'), kode SAP
  -- untuk customer ('600001'). NULL = seluruh data, dan itu satu-satunya nilai
  -- yang sah untuk superadmin, admin_rsvp, dan marketing.
  add column if not exists data_scope text;

comment on column public.profiles.allowed_pages is
  'Path halaman yang boleh dibuka. Array kosong = pakai preset bawaan role.';
comment on column public.profiles.data_scope is
  'Pembatas data: region untuk rsm, kode_sap untuk customer, NULL untuk akses penuh.';

-- Trigger ikut menuliskan kedua kolom baru supaya user yang dibuat lewat
-- Supabase Auth admin API langsung punya aksesnya, bukan menunggu update kedua.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, allowed_pages, data_scope)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer'),
    coalesce(
      -- user_metadata menyimpannya sebagai array JSON; kalau tidak ada,
      -- array kosong berarti "pakai preset role".
      (select array_agg(value #>> '{}')
         from jsonb_array_elements(new.raw_user_meta_data -> 'allowed_pages')),
      '{}'
    ),
    nullif(new.raw_user_meta_data ->> 'data_scope', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
