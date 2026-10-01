set names utf8mb4;
set time_zone = '+00:00';

-- Proses kupon undian per toko: pembuatan lalu pemberian. Setiap catatan
-- adalah kejadian tersendiri supaya ada jejak audit dan bisa dibatalkan.
create table if not exists kupon_proses (
  id varchar(36) primary key,
  dealer_night_id varchar(36) not null,
  customer_id varchar(36) not null,
  tahap enum('dibuat', 'diberikan') not null,
  pink int not null default 0,
  hijau int not null default 0,
  penerima varchar(200),
  catatan text,
  recorded_by varchar(36),
  created_at datetime(3) not null default current_timestamp(3),
  constraint kupon_proses_dn_fk foreign key (dealer_night_id)
    references dealer_nights(id) on delete cascade,
  constraint kupon_proses_customer_fk foreign key (customer_id)
    references customers(id) on delete cascade,
  constraint kupon_proses_profile_fk foreign key (recorded_by)
    references profiles(id) on delete set null,
  constraint kupon_proses_jumlah_ck check (pink >= 0 and hijau >= 0 and pink + hijau > 0),
  index kupon_proses_customer_idx (customer_id),
  index kupon_proses_dn_idx (dealer_night_id, created_at)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;
