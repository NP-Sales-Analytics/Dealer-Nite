set names utf8mb4;
set time_zone = '+00:00';

-- Cakupan depot per akun di dalam Dealer Night yang diizinkan. NULL = semua depot.
alter table profiles add column depot_codes json null;
