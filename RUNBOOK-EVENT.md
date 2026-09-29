# Runbook Malam Dealer Nite

Panduan singkat untuk tim internal saat event berlangsung.

## Sebelum acara

1. Buka `/leaderboard` dan pastikan Dealer Night yang benar tampil.
2. Pastikan leaderboard menampilkan 113 toko untuk DN Bogor dan nilai teratas memakai format miliar/juta.
3. Login dengan satu akun admin dan satu akun DN untuk menguji hak akses.
4. Pada akun DN, pastikan pilihan Dealer Night terkunci dan tombol **Sesuaikan** tidak ada.
5. Buka `/order/detail`, cari satu MG Code, dan periksa target awal serta target efektif.
6. Buka `/reservation`, cari satu toko, dan pastikan jumlah undangan otomatis 1.
7. Pastikan koneksi MySQL, Vercel, dan Upstash (jika diaktifkan) sehat.

Tidak perlu mengaktifkan koneksi push atau mengatur batas waktu. Halaman membaca ulang data otomatis setiap 10 detik selama tab terlihat.

## Penyesuaian Target DN

1. Login sebagai `superadmin` atau `admin`.
2. Buka **Target DN → Detail Target DN**.
3. Cari nama toko atau MG Code.
4. Tekan **Sesuaikan**.
5. Masukkan nominal target baru dan catatan singkat.
6. Periksa nilai **Selisih** sebelum menyimpan.
7. Tekan **Simpan Penyesuaian**.
8. Pastikan target efektif berubah dan riwayat memuat pencatat serta waktunya.

Target boleh naik atau turun, tetapi hasil akhirnya tidak boleh kurang dari Rp50.000.000. Aplikasi menyimpan delta di ledger; target awal dari master tidak ditimpa.

## Gejala dan tindakan

### Target di bawah Rp50 juta ditolak

Ini perilaku yang benar. Periksa kembali nominal. Jangan mengubah data langsung di database untuk melewati batas.

### Target tersimpan tetapi leaderboard belum berubah

Tunggu paling lama 10 detik atau pindah halaman lalu kembali. Jika belum berubah:

1. Buka riwayat toko di `/order/detail`.
2. Jika ledger baru ada, periksa endpoint leaderboard dan koneksi MySQL.
3. Jika ledger baru tidak ada, baca pesan pada form dan ulangi sekali.
4. Jangan menekan simpan berkali-kali tanpa memeriksa riwayat.

### Akun DN melihat Dealer Night yang salah

1. Hentikan penggunaan akun tersebut.
2. Superadmin membuka **User Management**.
3. Perbaiki Dealer Night akun.
4. Minta pengguna keluar lalu login kembali.
5. Uji akses langsung ke DN lain; API harus menolak.

### Login gagal untuk semua akun

1. Pastikan `AUTH_SECRET` deployment tidak berubah setelah akun dibuat.
2. Pastikan koneksi `DATABASE_URL` aktif.
3. Periksa tabel `profiles` dan status deployment terakhir.
4. Jangan mengganti `AUTH_SECRET` pada malam acara kecuali semua password akan dibuat ulang.

### Aplikasi lambat

1. Periksa status deployment dan koneksi MySQL.
2. Pastikan jumlah koneksi MySQL belum mencapai batas server.
3. Periksa Upstash bila rate limiting aktif.
4. Hindari reload serentak di semua perangkat; polling otomatis sudah cukup.

## Kehadiran

- Hanya superadmin/admin yang dapat mencatat atau mengoreksi kehadiran.
- Akun DN hanya dapat melihat rekap DN miliknya.
- Pencatatan ulang MG Code yang sama memperbarui catatan yang sudah ada, bukan membuat duplikat.
- Tamu yang tidak ada di master dapat dicatat manual oleh admin.

## Larangan operasional

- Jangan menghapus database, master toko, atau ledger penyesuaian.
- Jangan menjalankan migration ulang tanpa backup dan persetujuan operator.
- Jangan mengubah target langsung di tabel `customers`.
- Jangan membagikan password akun internal atau URL database.
- Jangan memakai akun database admin server sebagai kredensial runtime jangka panjang.

## Setelah acara

1. Unduh data Target DN dan kehadiran.
2. Simpan backup database.
3. Catat akun sementara yang perlu dinonaktifkan.
4. Rotasi kredensial yang pernah dibagikan melalui chat atau kanal tidak aman.
5. Jangan menghapus ledger; ledger adalah audit trail penyesuaian malam event.
