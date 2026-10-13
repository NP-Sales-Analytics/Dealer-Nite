set names utf8mb4;
set time_zone = '+00:00';

-- No. Undian dari master data (opsional). Dipakai sebagai kunci pencarian di
-- pencatatan kehadiran dan mengisi otomatis nomor undian saat toko dipilih.
-- Unik per Dealer Night; NULL (belum didata) boleh banyak.
alter table customers
  add column no_undian varchar(20) null after mg_name,
  add unique index customers_dn_undian_unique (dealer_night_id, no_undian);
