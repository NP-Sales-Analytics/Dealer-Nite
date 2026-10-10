set names utf8mb4;
set time_zone = '+00:00';

-- Super Admin wilayah: hanya melihat DN wilayahnya. NULL = Super Admin pusat (semua wilayah).
-- Hanya bermakna untuk role superadmin; role lain dibatasi lewat dealer_night_ids.
alter table profiles
  add column wilayah varchar(50) null default null,
  add column created_by varchar(36) null default null,
  add constraint profiles_wilayah_ck check (wilayah is null or wilayah in ('Indonesia Barat', 'Indonesia Timur'));

-- Super Admin wilayah hanya mengelola user yang ia buat sendiri.
create index profiles_created_by_idx on profiles (created_by);
