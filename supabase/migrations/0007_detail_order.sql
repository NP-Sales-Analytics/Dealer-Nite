-- Halaman Detail Order (rekap formulir fisik) + batas waktu penambahan order.

-- Pengambilan pertama yang tercatat = lantai permanen. Semua toko mulai dari 0;
-- begitu nilai pertama tercatat, angka di Tambah Order tidak boleh turun di
-- bawahnya. NULL berarti toko belum pernah mengambil sama sekali.
--
-- Invarian yang dijaga kode: dus_awal <= total. Admin di Detail Order adalah
-- otoritas - kalau ia menetapkan total lebih rendah, dus_awal ikut turun.
alter table public.customers add column if not exists dus_awal integer;

-- Setelan aplikasi berbentuk key-value supaya setelan berikutnya tidak perlu
-- tabel baru. Saat ini hanya dipakai untuk 'order_deadline'.
create table if not exists public.app_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Aplikasi mengakses DB lewat role postgres (BYPASSRLS), jadi RLS aktif tanpa
-- policy = tertutup rapat untuk anon key. Sama dengan tabel lain di 0001.
alter table public.app_settings enable row level security;

-- Mulai dari nol: seluruh order sampel dan hasil uji dibuang supaya rekap
-- formulir fisik malam event berangkat dari angka bersih.
delete from public.order_adjustments;
