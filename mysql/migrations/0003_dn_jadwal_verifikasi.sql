set names utf8mb4;
set time_zone = '+00:00';

-- Jadwal dan depot yang menjadi bagian tiap pelaksanaan DN.
alter table dealer_nights
  add column event_date date null,
  add column depot_codes json null;

-- Verifikasi target pertama oleh admin DN. Kupon undian baru berlaku setelahnya.
alter table customers
  add column verified_at datetime(3) null,
  add column verified_by varchar(36) null,
  add constraint customers_verified_by_fk foreign key (verified_by)
    references profiles(id) on delete set null;

-- Daftar DN Indonesia Barat 2026/27. Nama DN yang sudah ada tidak ditimpa.
insert into dealer_nights (id, slug, name, active, event_date, depot_codes) values
  (uuid(), 'bandung',   'DN Bandung',   true, '2026-09-26', json_array('1F', '5I', '5H', '1W')),
  (uuid(), 'bogor',     'DN Bogor',     true, '2026-10-03', json_array('1S', '5C')),
  (uuid(), 'serpong',   'DN Serpong',   true, '2026-10-10', json_array('1R', '1X', '5Q', '5O', '5R', '5W')),
  (uuid(), 'bekasi',    'DN Bekasi',    true, '2026-10-24', json_array('1E', '1C', '5P', '5K')),
  (uuid(), 'jakarta',   'DN Jakarta',   true, '2026-10-31', json_array('1A', '1D', '1B', '1K', '5L', '1H', '5U', '1L', '1M')),
  (uuid(), 'semarang',  'DN Semarang',  true, '2026-11-07', json_array('1P', '5M', '1Y', '5A', '7A')),
  (uuid(), 'solo',      'DN Solo',      true, '2026-11-14', json_array('1N', '1O', '5N', '1V', '1Q')),
  (uuid(), 'pontianak', 'DN Pontianak', true, '2026-11-21', json_array('1T', '5F', '5G', '5J')),
  (uuid(), 'lampung',   'DN Lampung',   true, '2026-11-28', json_array('1G', '1Z')),
  (uuid(), 'medan',     'DN Medan',     true, '2026-12-05', json_array('4A', '4C', '4D', '4F', '4B')),
  (uuid(), 'pekanbaru', 'DN Pekanbaru', true, '2026-12-12', json_array('1U')),
  (uuid(), 'palembang', 'DN Palembang', true, '2026-12-19', json_array('1J', '5D')),
  (uuid(), 'padang',    'DN Padang',    true, '2027-01-09', json_array('1I', '5B', '5V'))
on duplicate key update event_date = values(event_date), depot_codes = values(depot_codes);
