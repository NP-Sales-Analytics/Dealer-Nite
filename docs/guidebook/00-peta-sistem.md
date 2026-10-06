# Peta Sistem: DN Administration System

URL: https://dn.bi-nipponpaint.com/ · Stack: Next.js 15 + MySQL · Target pembaca guidebook: **Admin DN**

## 1. Login & navigasi

- **Login** (`/login`): satu kolom password saja (tanpa username); tiap akun punya password unik. Tombol mata untuk menampilkan password.
- Sesudah login, pengguna diarahkan ke halaman awal sesuai role: Super Admin/Admin → Pencatatan Kehadiran, Marketing/Management → Dashboard, Akun DN → Leaderboard.
- **Layout**: sidebar kiri (tertutup secara bawaan, dibuka lewat tombol bulat `‹`/`›` di tepi sidebar; di HP lewat tombol menu di header) + header berisi judul & keterangan halaman. Profil dan tombol **Keluar** ada di bawah sidebar.
- Data di hampir semua halaman **diperbarui otomatis tiap 10 detik**.
- Setiap halaman punya pemilih **Dealer Night (DN)**; bawaannya DN terdekat yang akan datang.

Menu sidebar (dikelompokkan):

| Grup | Menu | Rute |
|---|---|---|
| Kehadiran | Dashboard Kehadiran | `/dashboard` |
| | Pencatatan Kehadiran | `/reservation` |
| | Detail Toko Hadir | `/kehadiran` |
| Target DN | Leaderboard Target DN | `/leaderboard` |
| | Detail Target DN | `/order/detail` |
| | Detail Kupon | `/kupon` |
| Setting | User Management | `/admin/users` |
| | Setting Target DN | `/setting/pax` |

## 2. Role & hak akses

Menu yang tampil mengikuti daftar halaman yang diizinkan per akun (diatur Super Admin di User Management); tabel di bawah adalah bawaannya. Akun juga bisa dibatasi ke DN dan depot tertentu.

| Role | Kehadiran | Detail Target DN | Detail Kupon | Unduh | Setting |
|---|---|---|---|---|---|
| Super Admin | catat, lihat, ubah, hapus | verifikasi, sesuaikan, kelola master | buat & beri kupon | ya | semua |
| Admin (Admin DN) | catat, lihat, ubah, hapus | verifikasi, sesuaikan, kelola master | buat & beri kupon | ya | Setting Target DN |
| Marketing / Management | lihat | lihat | lihat (jika diizinkan) | ya | – |
| Akun DN | lihat (1 DN) | lihat | lihat (jika diizinkan) | tidak | – |

Keputusan: Detail Kupon **diberikan untuk Admin** (diatur Super Admin lewat User Management → halaman yang bisa diakses). Guidebook menganggap Admin DN punya akses ini.

Keputusan screenshot: login memakai Super Admin, jadi menu khusus Super Admin (User Management) di-crop/ditandai "khusus Super Admin". Semua screenshot memakai data asli tanpa blur/penyamaran (keputusan pemilik dokumen, revisi setelah Modul C).

## 3. Alur kerja menyeluruh (end-to-end)

```
[Pusat] Upload master toko + Target Pusat per DN
        │
        ▼
[Hari H] Pencatatan Kehadiran ── cari toko → isi pax + nomor undian → Simpan
        │                         (toko tak ada di master → Tambah manual)
        ▼
Detail Toko Hadir / Dashboard Kehadiran ── pantau, koreksi, unduh Excel
        │
        ▼
Detail Target DN ── buka toko → Verifikasi target (No. Formulir otomatis)
        │            → bila berubah lagi: Penyesuaian (penambahan/pengurangan)
        ▼
Detail Kupon ── hak kupon dihitung dari target terverifikasi
        │        Pink = 1 per Rp100 jt, Hijau = 1 per Rp25 jt
        │        Status: Belum Verifikasi → Perlu Dibuat → Siap Diberikan → Selesai
        ▼
Leaderboard Target DN ── peringkat toko terverifikasi
```

## 4. Modul yang dibahas di guidebook

### Modul A: Kehadiran (3 halaman)

1. **Pencatatan Kehadiran** (`/reservation`)
   - Pilih DN → ketik nama toko / MG Code di kolom cari → pilih toko → muncul kartu detail toko.
   - Isi **Jumlah pax hadir** (stepper +/–) dan **Nomor undian** (hanya angka, 1–20 digit) → **Simpan Kehadiran**.
   - Jika toko sudah pernah dicatat: muncul konfirmasi "Toko ini sudah dicatat hadir" → **Ya, ganti** atau **Batal**.
   - Toko tidak ditemukan → link **Tidak ditemukan? Tambah manual** → form *Tambah Tamu Manual* (Nama Customer, Depot, Pax, Nomor Undian).
2. **Dashboard Kehadiran** (`/dashboard`)
   - Filter DN, Region, Depot → kartu KPI kehadiran, grafik batang per depot, diagram lingkaran kapasitas.
3. **Detail Toko Hadir** (`/kehadiran`)
   - Cari + filter DN/Region/Depot → tabel (Depot, Nama Customer, Pax, No. Undian, Waktu – bisa diurutkan).
   - Klik baris → dialog *Detail Toko Hadir*. Ikon pensil → *Ubah Catatan Kehadiran*; ikon tempat sampah → hapus catatan (dengan konfirmasi).
   - Tombol **Unduh** → Excel sesuai filter aktif.

### Modul B: Detail Target DN (`/order/detail`)

- Bagian atas: jumlah toko terdaftar, tombol **Download CSV**, **Upload Master**, **Tambah Master Data** (Admin/Super Admin).
- 4 kartu KPI: Total Target DN, Pencapaian Malam DN, Persentase Pencapaian, Total Penambahan (KPI ikut filter depot).
- Filter: cari (toko/MG Code/salesman/SPV), DN, Region, Depot, **Kehadiran** (Sudah/Belum Hadir), **Penambahan** (Ada/Tanpa).
- Tab status: **Semua / Belum Verifikasi / Terverifikasi**.
- Tabel: Depot, Nama Customer, Kehadiran, Target DN, Penambahan, Total Penyesuaian, Aksi (edit master, hapus toko).
- Klik baris → dialog detail toko:
  - *Perjalanan Target DN*: 1 Target Pusat → 2 Verifikasi Admin DN → 3 Target Saat Ini.
  - *Data Toko* (No. Formulir, SOTP, Region, Salesman, SPV, Kehadiran) dan *Riwayat Target*.
  - Panel kanan: **Verifikasi** (jika belum) atau **Penyesuaian** (jika sudah) → isi nominal Target DN baru (minimal Rp50.000.000) → lihat Selisih → Simpan. Sistem memberi **No. Formulir** otomatis untuk ditulis di formulir fisik.

### Modul C: Detail Kupon (`/kupon`)

- Ringkasan per warna: **Kupon Pink** (1 per Rp100 jt target) dan **Kupon Hijau** (1 per Rp25 jt target): total hak, dibuat, diberikan, perlu dibuat, siap diberikan.
- 4 kartu status (klik untuk menyaring): Perlu Dibuat, Siap Diberikan, Selesai, Belum Verifikasi.
- Filter sama seperti Detail Target DN (cari juga berdasarkan nomor undian).
- Tabel: centang, Nama Customer, Kehadiran, Hak Kupon, Dibuat, Diberikan, Aksi (**Buat** / **Berikan** / Selesai / Belum verifikasi).
- Klik baris/aksi → dialog kupon toko: **Catat Pembuatan** atau **Catat Pemberian** (jumlah pink & hijau), riwayat kupon, batalkan catatan.
- Centang beberapa toko → bilah aksi massal: **Tandai Dibuat** / **Tandai Diberikan**.
- **Download CSV**.
- Aturan: kenaikan target setelah kupon dibuat otomatis memunculkan sisa "Perlu Dibuat"; penurunan target tidak menarik kupon yang sudah dibuat.

## 5. Di luar cakupan guidebook (disebut singkat saja)

Leaderboard Target DN, Setting Target DN, User Management — tampil di peta alur dan sidebar, tapi tidak dibuat step-by-step.

## 6. Rencana screenshot (mode baca saja)

Login (password tidak diketik terlihat), sidebar terbuka, tiap halaman di atas dalam kondisi awal, hasil pencarian toko, kartu detail toko + form pax/undian (tanpa Simpan), form Tambah Manual (tanpa Simpan), dialog detail kehadiran, dialog Ubah (tanpa Simpan), dialog detail Target DN (panel verifikasi tanpa Simpan), dialog kupon (tanpa Catat), dropdown filter. **Tidak diklik**: Simpan, Hapus, Ya ganti, Upload, Catat, Tandai, Reset kupon/target, Keluar. Screenshot memakai data asli tanpa penyamaran.
