-- Target pax tidak lagi diturunkan dari qty_undangan per customer. Satu baris
-- di tabel ini adalah target maksimum untuk satu depot yang tampil di master
-- Detail Order.
create table if not exists public.depot_pax_targets (
  depot       text primary key,
  wilayah     text,
  region      text,
  target_pax  integer not null default 0,
  updated_at  timestamptz not null default now(),
  constraint depot_pax_targets_depot_ck check (btrim(depot) <> ''),
  constraint depot_pax_targets_target_ck check (target_pax between 0 and 1000000)
);

-- Aplikasi mengakses DB lewat koneksi server. Tabel setting tidak boleh dibaca
-- atau ditulis langsung melalui anon/authenticated Data API.
alter table public.depot_pax_targets enable row level security;
revoke all on table public.depot_pax_targets from anon, authenticated;

-- Isi awal mempertahankan angka dashboard lama. Setelah migrasi, angka tersebut
-- berdiri sendiri sebagai setting dan tidak lagi berubah saat qty_undangan
-- customer berubah.
insert into public.depot_pax_targets (depot, wilayah, region, target_pax)
select btrim(depot),
       mode() within group (order by nullif(btrim(wilayah), '')),
       mode() within group (order by nullif(btrim(region), '')),
       coalesce(sum(qty_undangan), 0)::integer
from public.customers
where nullif(btrim(depot), '') is not null
group by btrim(depot)
on conflict (depot) do update
set wilayah = excluded.wilayah,
    region = excluded.region;

-- Depot sintetis untuk tamu non-customer. Metadata wilayah/regionnya membuat
-- catatan manual tetap bisa disaring dan direkap dengan arah yang jelas.
insert into public.depot_pax_targets (depot, wilayah, region, target_pax)
values ('Komunitas & Media', 'Komunitas & Media', 'Komunitas & Media', 0)
on conflict (depot) do update
set wilayah = excluded.wilayah,
    region = excluded.region;

-- Superadmin yang memakai daftar halaman eksplisit memperoleh halaman baru.
-- Array kosong tetap berarti memakai preset bawaan dari aplikasi.
update public.profiles
set allowed_pages = array_append(allowed_pages, '/setting/pax')
where role = 'superadmin'
  and cardinality(allowed_pages) > 0
  and not ('/setting/pax' = any(allowed_pages));

