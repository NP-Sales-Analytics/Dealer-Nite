set names utf8mb4;
set time_zone = '+00:00';

-- Target DN minimal per Dealer Night (sebelumnya tetap Rp50 juta untuk semua DN).
-- Batas bawah Rp1 juta supaya salah ketik (mis. 50 alih-alih 50.000.000) tertolak.
alter table dealer_nights
  add column min_target_dn bigint not null default 50000000,
  add constraint dealer_nights_min_target_ck check (min_target_dn >= 1000000);

-- Minimal per toko sekarang mengikuti DN-nya dan ditegakkan di aplikasi;
-- di database tinggal batas bawah globalnya.
alter table customers drop check customers_target_min_ck;
alter table customers add constraint customers_target_min_ck check (target_dn_awal >= 1000000);
