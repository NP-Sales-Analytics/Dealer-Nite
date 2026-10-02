# Uji Beban Dealer Nite (k6)

Uji dijalankan ke production, tetapi semua data tulis masuk ke Dealer Night
terisolasi **DN Loadtest** (tidak aktif, tidak terlihat pengguna asli). DN lain,
termasuk penghitung No. Formulir-nya, tidak tersentuh.

## Persiapan

1. Buka SSH tunnel ke server MySQL (port lokal 13306).
2. Buat `.env.loadtest` (diabaikan Git):

   ```dotenv
   SUPERADMIN_PASSWORD=<password Super Admin production>
   DATABASE_URL=mysql://<akun>:<password>@127.0.0.1:13306/pylox_dn
   ```

   AUTH_SECRET production bersifat Sensitive di Vercel dan tidak bisa dibaca,
   jadi akun uji dibuat lewat User Management (hash password tetap dari server).

3. Buat data uji: DN Loadtest + 120 toko (DB), lalu 20 akun admin + sesinya (browser):

   ```powershell
   npx tsx --env-file=.env.loadtest scripts/loadtest-dn.ts seed
   npx tsx --env-file=.env.loadtest scripts/loadtest-dn.ts akun
   ```

## Menjalankan

Pantau server MySQL di terminal terpisah selama uji:

```powershell
npx tsx --env-file=.env.loadtest scripts/loadtest-mysql-monitor.ts
```

Lalu jalankan dari folder `load-tests/scenarios`:

```powershell
k6 run -e MODE=smoke  dealer-nite.js   # 5 VU, 1,5 menit - wajib lulus dulu
k6 run -e MODE=load   dealer-nite.js   # naik ke 100 VU, tahan 10 menit
k6 run -e MODE=stress dealer-nite.js   # 100 -> 200 VU untuk mencari titik jenuh
```

Tambahkan `--summary-export ../data/report-<mode>.json` untuk menyimpan
ringkasan. Uji berhenti otomatis bila p95 > 3 detik atau error server > 2%.

Campuran pengguna (per 10 VU): 4 pencatat kehadiran (cari + check-in), 3 layar
pemantau (dashboard/kehadiran/leaderboard, polling 10 detik), 2 admin target
(daftar, riwayat, pratinjau formulir, verifikasi/penyesuaian), 1 admin kupon.

## Selesai

Selalu bersihkan data uji, juga bila uji gagal di tengah jalan:

```powershell
npx tsx --env-file=.env.loadtest scripts/loadtest-dn.ts cleanup
```
