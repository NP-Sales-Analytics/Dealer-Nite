create extension if not exists pg_trgm;

create type public.user_role as enum ('superadmin', 'admin_rsvp', 'rsm', 'customer');

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text not null default '',
  role       public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  wilayah      text,
  region       text,
  depot        text,
  pic_rsm_asm  text,
  nama_toko    text not null,
  nama_pemilik text,
  kode_sap     text not null unique,
  qty_undangan integer not null default 1 check (qty_undangan >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- gin_trgm_ops mempercepat ILIKE '%...%' sekaligus similarity() untuk fuzzy search.
create index customers_nama_toko_trgm on public.customers using gin (nama_toko gin_trgm_ops);
create index customers_kode_sap_trgm  on public.customers using gin (kode_sap gin_trgm_ops);
create index customers_depot_idx      on public.customers (depot);

create table public.reservations (
  id                   uuid primary key default gen_random_uuid(),
  customer_id          uuid references public.customers(id) on delete cascade,
  is_manual_entry      boolean not null default false,
  manual_nama_customer text,
  manual_depot         text,
  qty_hadir            integer not null check (qty_hadir >= 0),
  checked_in_by        uuid references auth.users(id) on delete set null,
  checked_in_at        timestamptz not null default now(),
  constraint reservations_source_ck check (
    (is_manual_entry = false and customer_id is not null and manual_nama_customer is null)
    or
    (is_manual_entry = true and customer_id is null and manual_nama_customer is not null)
  )
);

-- Satu toko terdaftar = satu baris kehadiran. Pencatatan ulang meng-update baris ini,
-- sehingga sum(qty_hadir) tidak pernah dobel-hitung. Manual entry (customer_id null)
-- tidak dibatasi.
create unique index reservations_customer_unique
  on public.reservations (customer_id) where customer_id is not null;
create index reservations_checked_in_at_idx on public.reservations (checked_in_at desc);

-- Aplikasi mengakses DB lewat Drizzle/pooler dengan role `postgres` (BYPASSRLS),
-- jadi RLS aktif TANPA policy = PostgREST + anon key tertutup rapat untuk semua orang.
alter table public.customers    enable row level security;
alter table public.reservations enable row level security;
alter table public.profiles     enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
