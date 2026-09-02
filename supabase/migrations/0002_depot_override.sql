-- Depot per-catatan kehadiran.
--
-- Depot sebuah toko terdaftar berasal dari master data SAP (customers.depot) dan
-- tidak boleh diubah dari layar pencatatan: satu koreksi malam event akan
-- memindahkan toko itu secara permanen, termasuk untuk laporan berikutnya.
-- Kolom ini menyimpan koreksi yang berlaku HANYA untuk catatan kehadiran ini.
--
-- Urutan pemakaian: depot_override -> customers.depot -> manual_depot.
alter table public.reservations
  add column depot_override text;
