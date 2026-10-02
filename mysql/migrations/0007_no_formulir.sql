set names utf8mb4;
set time_zone = '+00:00';

-- Nomor formulir fisik: urutan per Dealer Night, dipakai bersama verifikasi dan
-- penyesuaian. Penghitungnya tidak pernah mundur, jadi nomor tidak dipakai ulang
-- walaupun riwayat toko direset.
alter table dealer_nights add column form_terakhir int not null default 0;

-- Verifikasi tanpa perubahan nilai kini juga punya baris riwayat (delta 0)
-- supaya nomor formulirnya tercatat.
alter table target_adjustments drop check target_adjustments_delta_ck;

alter table target_adjustments
  add column dealer_night_id varchar(36) null,
  add column no_formulir int null;

update target_adjustments a
join customers c on c.id = a.customer_id
set a.dealer_night_id = c.dealer_night_id;

insert into target_adjustments (id, customer_id, dealer_night_id, delta, jenis, recorded_by, created_at)
select uuid(), c.id, c.dealer_night_id, 0, 'verifikasi', c.verified_by, c.verified_at
from customers c
where c.verified_at is not null
  and not exists (
    select 1 from target_adjustments a where a.customer_id = c.id and a.jenis = 'verifikasi'
  );

-- Riwayat yang sudah ada diberi nomor berurutan menurut waktu, per Dealer Night.
update target_adjustments a
join (
  select id, row_number() over (partition by dealer_night_id order by created_at, id) as nomor
  from target_adjustments
) x on x.id = a.id
set a.no_formulir = x.nomor;

update dealer_nights dn
set dn.form_terakhir = coalesce((
  select max(a.no_formulir) from target_adjustments a where a.dealer_night_id = dn.id
), 0);

alter table target_adjustments
  modify dealer_night_id varchar(36) not null,
  modify no_formulir int not null,
  add constraint target_adjustments_dn_fk foreign key (dealer_night_id)
    references dealer_nights(id) on delete cascade,
  add constraint target_adjustments_dn_form_unique unique (dealer_night_id, no_formulir);
