-- Nama customer disimpan huruf besar semua.
--
-- Data awal dari CSV ditulis dengan campuran huruf ("Cv.Mega Warna Agung",
-- "PT. KARMAN ...") sehingga daftar terlihat tidak rapi. Penyeragaman dilakukan
-- di satu tempat: skema Zod untuk input baru, parser CSV untuk seed ulang, dan
-- migrasi ini untuk data yang sudah terlanjur masuk.
update public.customers
   set nama_toko    = upper(nama_toko),
       nama_pemilik = upper(nama_pemilik),
       updated_at   = now()
 where nama_toko <> upper(nama_toko)
    or nama_pemilik is distinct from upper(nama_pemilik);

update public.reservations
   set manual_nama_customer = upper(manual_nama_customer)
 where manual_nama_customer is not null
   and manual_nama_customer <> upper(manual_nama_customer);
