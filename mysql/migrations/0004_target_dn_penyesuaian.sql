set names utf8mb4;
set time_zone = '+00:00';

-- Total Target DN per pelaksanaan, diatur di Setting seperti target pax.
alter table dealer_nights
  add column target_dn bigint not null default 0,
  add constraint dealer_nights_target_dn_ck check (target_dn >= 0);

-- Nilai target saat diverifikasi admin DN; dasar kupon yang sudah dibuatkan.
alter table customers add column target_verifikasi bigint null;

-- Membedakan perubahan saat verifikasi dari penyesuaian sesudahnya.
alter table target_adjustments
  add column jenis enum('verifikasi', 'penyesuaian') not null default 'penyesuaian';

update target_adjustments a
join customers c on c.id = a.customer_id
set a.jenis = 'verifikasi'
where c.verified_at is not null and a.created_at <= c.verified_at;

update customers c
set c.target_verifikasi = c.target_dn_awal + coalesce((
  select sum(a.delta) from target_adjustments a
  where a.customer_id = c.id and a.jenis = 'verifikasi'
), 0)
where c.verified_at is not null;
