set names utf8mb4;
set time_zone = '+00:00';

-- Target pax sekarang per Dealer Night, bukan per depot.
alter table dealer_nights
  add column target_pax int not null default 0,
  add constraint dealer_nights_target_pax_ck check (target_pax between 0 and 1000000);

update dealer_nights dn
set target_pax = coalesce(
  (select sum(t.target_pax) from depot_pax_targets t where t.dealer_night_id = dn.id), 0
);

drop table depot_pax_targets;

-- Cakupan Dealer Night berlaku untuk semua role. NULL = semua Dealer Night.
alter table profiles add column dealer_night_ids json null;

update profiles set dealer_night_ids = json_array(dealer_night_id) where dealer_night_id is not null;
update profiles set dealer_night_ids = json_array() where role = 'dn_user' and dealer_night_id is null;

alter table profiles drop foreign key profiles_dealer_night_fk;
alter table profiles drop column dealer_night_id;

-- Nomor undian per catatan kehadiran, unik dalam satu Dealer Night.
alter table reservations
  add column nomor_undian varchar(20) null,
  add constraint reservations_dn_undian_unique unique (dealer_night_id, nomor_undian);
