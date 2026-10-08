set names utf8mb4;
set time_zone = '+00:00';

-- Kupon per Dealer Night: warna fisiknya (Indonesia Timur memakai putih/kuning,
-- bukan pink/hijau) dan nilai pembaginya bisa berbeda tiap DN. Kolom tetap
-- bernama pink/hijau sebagai slot kupon besar/kecil; label mengikuti skema.
alter table dealer_nights
  add column kupon_skema enum('pink_hijau', 'putih_kuning') not null default 'pink_hijau',
  add column nilai_kupon_pink bigint not null default 100000000,
  add column nilai_kupon_hijau bigint not null default 25000000,
  add constraint dealer_nights_nilai_kupon_ck check (nilai_kupon_pink > 0 and nilai_kupon_hijau > 0);

-- Pax terdaftar per toko dari kolom Pax upload master. Sebelumnya dipaksa 1
-- untuk semua toko, jadi nilai lama tidak bermakna: dikosongkan (= belum didata).
alter table customers
  drop check customers_qty_undangan_ck,
  modify qty_undangan int null default null;
update customers set qty_undangan = null;
alter table customers
  add constraint customers_pax_ck check (qty_undangan is null or qty_undangan between 1 and 1000);

-- Daftar DN Indonesia Timur 2026/27, kupon putih/kuning.
insert into dealer_nights (id, slug, name, active, event_date, depot_codes, kupon_skema) values
  (uuid(), 'manado',      'DN Manado',      true, '2026-09-12', json_array('3M', '3V'), 'putih_kuning'),
  (uuid(), 'kupang',      'DN Kupang',      true, '2026-09-26', json_array('3C'), 'putih_kuning'),
  (uuid(), 'lombok',      'DN Lombok',      true, '2026-10-03', json_array('3I'), 'putih_kuning'),
  (uuid(), 'jember',      'DN Jember',      true, '2026-10-10', json_array('3G', '6C'), 'putih_kuning'),
  (uuid(), 'kediri',      'DN Kediri',      true, '2026-10-17', json_array('3F', '6B'), 'putih_kuning'),
  (uuid(), 'malang',      'DN Malang',      true, '2026-10-24', json_array('3E', '3Z', '6J'), 'putih_kuning'),
  (uuid(), 'balikpapan',  'DN Balikpapan',  true, '2026-10-31', json_array('3K', '3J', '6H'), 'putih_kuning'),
  (uuid(), 'surabaya',    'DN Surabaya',    true, '2026-11-07', json_array('6N', '3B', '6D', '3D', '3T', '3Y', '6O'), 'putih_kuning'),
  (uuid(), 'makassar',    'DN Makassar',    true, '2026-11-21', json_array('3N', '3X', '3W', '6F', '3P'), 'putih_kuning'),
  (uuid(), 'palu',        'DN Palu',        true, '2026-11-28', json_array('3R'), 'putih_kuning'),
  (uuid(), 'kendari',     'DN Kendari',     true, '2026-12-05', json_array('3O', '6A'), 'putih_kuning'),
  (uuid(), 'sampit',      'DN Sampit',      true, '2026-12-12', json_array('3Q'), 'putih_kuning'),
  (uuid(), 'banjarmasin', 'DN Banjarmasin', true, '2027-01-16', json_array('3L', '6I', '6K'), 'putih_kuning'),
  (uuid(), 'gorontalo',   'DN Gorontalo',   true, '2027-01-23', json_array('3S'), 'putih_kuning'),
  (uuid(), 'bali',        'DN Bali',        true, '2027-01-30', json_array('3H', '3U', '6G'), 'putih_kuning')
on duplicate key update event_date = values(event_date), depot_codes = values(depot_codes), kupon_skema = values(kupon_skema);
