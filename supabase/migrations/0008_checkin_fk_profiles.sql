-- Perbaikan sisa migrasi 0006 (lepas dari Supabase Auth).
--
-- Saat itu FK profiles -> auth.users sudah dibuang, tapi reservations.checked_in_by
-- masih menunjuk auth.users (warisan 0001). Akibatnya setiap akun yang dibuat
-- lewat User Management SESUDAH migrasi itu - yang hanya ada di profiles dan
-- tidak punya baris di auth.users - gagal mencatat kehadiran dengan galat
-- "violates foreign key constraint", muncul di UI sebagai "Koneksi bermasalah".
-- Akun lama tetap jalan karena barisnya masih ada di auth.users, sehingga bug
-- ini hanya menimpa akun baru dan mudah luput.
--
-- Sekarang diarahkan ke profiles, tabel identitas kita yang sebenarnya. Maksud
-- aslinya dipertahankan: kalau akun admin dihapus, catatan kehadirannya tetap
-- ada dan pencatatnya menjadi NULL.
alter table public.reservations
  drop constraint if exists reservations_checked_in_by_fkey;

alter table public.reservations
  add constraint reservations_checked_in_by_fkey
  foreign key (checked_in_by) references public.profiles(id) on delete set null;
