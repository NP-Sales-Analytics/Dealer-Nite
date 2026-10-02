set names utf8mb4;
set time_zone = '+00:00';

-- No. Formulir boleh kosong: riwayat yang nomor fisiknya belum dicatat ulang
-- diisi manual belakangan. Unique (dealer_night_id, no_formulir) tetap berlaku
-- untuk nilai yang terisi; MySQL mengizinkan banyak NULL.
alter table target_adjustments modify no_formulir int null;
