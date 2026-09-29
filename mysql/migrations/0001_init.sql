set names utf8mb4;
set time_zone = '+00:00';

create table if not exists dealer_nights (
  id varchar(36) primary key,
  slug varchar(80) not null,
  name varchar(160) not null,
  active boolean not null default true,
  created_at datetime(3) not null default current_timestamp(3),
  constraint dealer_nights_slug_unique unique (slug)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists profiles (
  id varchar(36) primary key,
  email varchar(255),
  full_name varchar(200) not null default '',
  password_hash varchar(64),
  role enum('superadmin', 'admin', 'marketing', 'management', 'dn_user') not null default 'dn_user',
  allowed_pages json not null,
  dealer_night_id varchar(36),
  boleh_unduh boolean not null default false,
  created_at datetime(3) not null default current_timestamp(3),
  constraint profiles_password_hash_unique unique (password_hash),
  constraint profiles_dealer_night_fk foreign key (dealer_night_id)
    references dealer_nights(id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists customers (
  id varchar(36) primary key,
  dealer_night_id varchar(36) not null,
  mg_code varchar(32) not null,
  mg_name varchar(200) not null,
  sotp_code varchar(32) not null,
  sotp_name varchar(200) not null,
  depot_code varchar(20) not null,
  depot_name varchar(120) not null,
  wilayah varchar(120),
  region varchar(40),
  salesman varchar(200),
  spv varchar(200),
  target_dn_awal bigint not null,
  qty_undangan int not null default 1,
  created_at datetime(3) not null default current_timestamp(3),
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint customers_dn_mg_unique unique (dealer_night_id, mg_code),
  constraint customers_dn_fk foreign key (dealer_night_id)
    references dealer_nights(id) on delete cascade,
  constraint customers_target_min_ck check (target_dn_awal >= 50000000),
  constraint customers_qty_undangan_ck check (qty_undangan = 1),
  index customers_dn_idx (dealer_night_id),
  index customers_depot_idx (depot_code)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists target_adjustments (
  id varchar(36) primary key,
  customer_id varchar(36) not null,
  delta bigint not null,
  note text,
  recorded_by varchar(36),
  created_at datetime(3) not null default current_timestamp(3),
  constraint target_adjustments_customer_fk foreign key (customer_id)
    references customers(id) on delete cascade,
  constraint target_adjustments_profile_fk foreign key (recorded_by)
    references profiles(id) on delete set null,
  constraint target_adjustments_delta_ck check (delta <> 0),
  index target_adjustments_customer_idx (customer_id),
  index target_adjustments_created_at_idx (created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists reservations (
  id varchar(36) primary key,
  dealer_night_id varchar(36) not null,
  customer_id varchar(36),
  is_manual_entry boolean not null default false,
  manual_nama_customer varchar(200),
  manual_depot varchar(120),
  depot_override varchar(120),
  qty_hadir int not null,
  checked_in_by varchar(36),
  checked_in_at datetime(3) not null default current_timestamp(3),
  constraint reservations_customer_unique unique (customer_id),
  constraint reservations_dn_fk foreign key (dealer_night_id)
    references dealer_nights(id) on delete cascade,
  constraint reservations_customer_fk foreign key (customer_id)
    references customers(id) on delete cascade,
  constraint reservations_profile_fk foreign key (checked_in_by)
    references profiles(id) on delete set null,
  constraint reservations_source_ck check (
    (is_manual_entry = true and customer_id is null and manual_nama_customer is not null)
    or (is_manual_entry = false and customer_id is not null)
  ),
  constraint reservations_qty_ck check (qty_hadir >= 0),
  index reservations_dn_idx (dealer_night_id),
  index reservations_checked_in_at_idx (checked_in_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists depot_pax_targets (
  id varchar(36) primary key,
  dealer_night_id varchar(36) not null,
  depot_code varchar(20) not null,
  depot_name varchar(120) not null,
  wilayah varchar(120),
  region varchar(40),
  target_pax int not null default 0,
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3),
  constraint depot_pax_targets_dn_depot_unique unique (dealer_night_id, depot_code),
  constraint depot_pax_targets_dn_fk foreign key (dealer_night_id)
    references dealer_nights(id) on delete cascade,
  constraint depot_pax_targets_target_ck check (target_pax between 0 and 1000000),
  index depot_pax_targets_dn_idx (dealer_night_id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table if not exists app_settings (
  `key` varchar(100) primary key,
  value text not null,
  updated_at datetime(3) not null default current_timestamp(3) on update current_timestamp(3)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
