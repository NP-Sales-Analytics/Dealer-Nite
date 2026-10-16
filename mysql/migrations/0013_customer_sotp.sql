set names utf8mb4;
set time_zone = '+00:00';

-- Satu Master Group (MG) bisa punya beberapa Sold To Party (maks. 30 di aplikasi).
-- customers.sotp_code/sotp_name tetap ada sebagai SOTP utama (urutan 1) dan
-- diselaraskan oleh layanan master, supaya ekspor & laporan lama tetap jalan.
create table customer_sotp (
  id bigint not null auto_increment primary key,
  customer_id varchar(36) not null,
  urutan smallint not null,
  sotp_code varchar(32) not null,
  sotp_name varchar(200) not null,
  unique key customer_sotp_kode_unique (customer_id, sotp_code),
  key customer_sotp_urutan_idx (customer_id, urutan),
  constraint customer_sotp_customer_fk foreign key (customer_id) references customers (id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

insert into customer_sotp (customer_id, urutan, sotp_code, sotp_name)
select id, 1, sotp_code, sotp_name from customers;
