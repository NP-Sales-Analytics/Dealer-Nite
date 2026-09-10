-- Izin mengunduh data sebagai Excel, terpisah dari izin membuka halamannya.
--
-- Dipisah karena keduanya memang beda taruhannya: melihat rekap di layar masih
-- terikat sesi dan cakupan datanya, sedangkan berkas Excel bisa dikirim ke mana
-- saja dan tidak bisa ditarik kembali. Jadi "boleh melihat" tidak otomatis
-- berarti "boleh membawa pulang".
--
-- Default false: yang belum diatur tidak bisa mengunduh. Untuk fitur yang
-- taruhannya kerahasiaan, aman-dulu adalah bawaan yang benar - superadmin
-- menyalakannya satu per satu lewat User Management.
alter table public.profiles
  add column if not exists boleh_unduh boolean not null default false;

-- Superadmin yang sudah ada tetap bisa mengunduh: merekalah yang mengatur izin
-- ini, jadi mengunci mereka sendiri di luar hanya akan membuat fiturnya mustahil
-- dinyalakan.
update public.profiles set boleh_unduh = true where role = 'superadmin';
