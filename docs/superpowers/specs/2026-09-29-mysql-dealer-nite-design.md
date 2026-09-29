# Migrasi Pylox menjadi Dealer Nite berbasis MySQL

## Tujuan

Mengubah aplikasi event yang semula memakai Supabase/PostgreSQL dan pencatatan order dus menjadi aplikasi internal untuk pencatatan serta penyesuaian Target DN. Sistem baru memakai MySQL, tidak memindahkan data produksi lama, dan mulai dengan data `Master_Toko Bogor.csv` untuk acara DN Bogor.

Keberhasilan berarti aplikasi dapat dijalankan tanpa Supabase, seluruh akun bersifat internal, data hanya terlihat sesuai cakupan Dealer Night, target dapat disesuaikan dengan riwayat audit, serta leaderboard dan ekspor menampilkan nominal rupiah dengan benar.

## Arsitektur dan data

- Gunakan MySQL 8 dan Drizzle melalui driver `mysql2`. Hapus paket, konfigurasi, migrasi, dan kode Supabase/PostgreSQL.
- Gunakan UUID yang dibuat aplikasi dan disimpan sebagai `varchar(36)`. Simpan waktu dalam UTC memakai `datetime(3)` dan formatkan ke Asia/Jakarta di UI.
- `dealer_nights` menyimpan identitas acara. Seed awal membuat `DN Bogor`.
- `profiles` hanya menerima role `superadmin`, `admin`, `marketing`, `management`, dan `dn_user`. Login tetap memakai satu password unik yang disimpan sebagai hash; nama akun hanya untuk tampilan.
- Akun `dn_user` memiliki satu `dealer_night_id` wajib. Role global tidak dibatasi Dealer Night.
- `customers` menyimpan `dealer_night_id`, MG/SOTP code dan nama, kode/nama depot, salesman, SPV, `target_dn_awal bigint`, `qty_undangan` dengan default 1, serta timestamp. Keunikan MG Code berlaku per Dealer Night.
- `target_adjustments` adalah ledger immutable berisi `customer_id`, selisih nominal bertanda, pencatat, catatan opsional, dan waktu. Target efektif adalah `target_dn_awal + sum(delta)`.
- Target efektif tidak boleh kurang dari Rp50.000.000. Penyesuaian dari UI memasukkan nominal akhir; server menghitung selisih di dalam transaksi dan mengunci baris customer dengan `SELECT ... FOR UPDATE` sebelum menulis ledger.
- Tabel kehadiran, target pax depot, dan setting aplikasi yang masih relevan dipertahankan dalam dialek MySQL. Setting tenggat penyesuaian dihapus.

## Impor master dan perilaku aplikasi

- Parser baru membaca `Master_Toko Bogor.csv`: MG Code/Name sebagai identitas utama, SOTP Code/Name disimpan, Depot Code dipetakan melalui `Hierarchy Depot.csv`, Salesman dan SPV disimpan terpisah, Target DN dibersihkan menjadi integer rupiah, dan `qty_undangan` selalu 1.
- Seed bersifat idempotent per Dealer Night dan melakukan upsert berdasarkan pasangan Dealer Night + MG Code. Target awal mengikuti CSV; riwayat penyesuaian tidak dihapus oleh seed ulang.
- Leaderboard menampilkan target efektif terbesar ke terkecil. Nilai ringkas memakai `Rp5,62 M` untuk miliaran dan `Rp820 jt` untuk jutaan; formulir detail, riwayat, dan ekspor memakai nominal penuh.
- Semua istilah `Order`, `Tambah Order`, dan `dus` pada UI/API/ekspor diubah menjadi `Target DN`, `Penyesuaian Target`, dan rupiah.
- Tidak ada login toko. Jalur sesi customer, login MG/Kode SAP, serta tampilan customer self-service dihapus.
- `superadmin` dan `admin` dapat menyesuaikan target seluruh Dealer Night. `marketing` dan `management` melihat seluruh data dan dapat mengunduh laporan. `dn_user` hanya melihat data satu Dealer Night dan tidak dapat mengubah target.
- Filter region tidak lagi menjadi kontrol akses. Wilayah, region, dan depot tetap dapat dipakai sebagai metadata dan filter laporan.
- Supabase Realtime dihapus. Data leaderboard dan target disegarkan dengan polling 10 detik hanya saat tab terlihat, serta langsung disegarkan saat tab kembali aktif.

## MySQL dan deployment

- Gunakan database produksi `pylox_dn` dan database integrasi `pylox_dn_test`, keduanya ber-charset `utf8mb4` dan timezone koneksi UTC.
- Koneksi aplikasi menggunakan environment `DATABASE_URL`; kredensial tidak disimpan di repository. Pool dibuat konservatif untuk deployment Vercel dan divalidasi terhadap kapasitas server.
- Migrasi MySQL tunggal membuat skema kosong, foreign key, unique constraint, serta index untuk Dealer Night, MG Code, depot, waktu kehadiran, dan agregasi target.
- Pencarian memakai pencocokan substring MySQL yang case-insensitive; fitur typo-tolerant `pg_trgm` tidak dipertahankan.
- Repository Git utama adalah `NP-Sales-Analytics/Dealer-Nite`. Repository Pylox hanya dipertahankan sebagai remote arsip lokal dan tidak menjadi target push.

## Penanganan kegagalan dan keamanan

- Semua route mutasi melakukan validasi role, cakupan Dealer Night, nominal integer, dan batas minimum pada server.
- Percobaan mengakses Dealer Night lain menghasilkan 403; data tidak ditemukan menghasilkan 404; konflik penyesuaian ditangani oleh transaksi dan row lock.
- Password dan rahasia database hanya berasal dari environment. Password SSH/DB yang pernah dibagikan harus dirotasi setelah konfigurasi selesai.
- Importer menolak header yang hilang, MG Code kosong/duplikat, Target DN tidak valid, depot tidak dikenal, atau target di bawah Rp50 juta, dan melaporkan nomor baris tanpa melakukan impor parsial.

## Verifikasi

- Unit test parser master, format rupiah ringkas, kalkulasi target efektif, batas Rp50 juta, role, dan cakupan Dealer Night.
- Integration test MySQL untuk migrasi, seed idempotent, unique constraint, penyesuaian naik/turun, row locking, serta query leaderboard/filter/ekspor.
- Regression test login password-only, manajemen user, kehadiran dengan `qty_undangan = 1`, dan seluruh route yang dipertahankan.
- Jalankan lint, seluruh Vitest suite, build produksi, seed ke database uji, dan smoke test alur login -> leaderboard -> detail -> penyesuaian -> riwayat -> ekspor.
- Database produksi hanya dibuat/di-seed setelah semua verifikasi lulus pada `pylox_dn_test`.

## Asumsi yang dikunci

- MySQL target minimal versi 8.0 dan dapat dijangkau dari Vercel melalui port database yang disediakan.
- DN Bogor mencakup depot `1S Bogor` dan `5C Cianjur` berdasarkan file hierarki saat ini.
- Nilai rupiah berada dalam rentang aman JavaScript dan MySQL `bigint`; data saat ini jauh di bawah batas integer aman JavaScript.
- Akun Dealer Night hanya memiliki satu acara. Dukungan satu akun untuk banyak Dealer Night tidak termasuk dalam versi ini.
