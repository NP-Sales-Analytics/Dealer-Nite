# Audit dan Load Test Produksi — Batas 200 Pengguna

Target resmi adalah **200 pengguna bersamaan**. Proyek Supabase Free memiliki
batas 200 koneksi Realtime dan 100 channel join/detik, jadi alat ini tidak akan
membuka lebih dari 200 koneksi dan membatasi join menjadi maksimal 10/detik.

## Gerbang keselamatan

Tidak boleh ada traffic produksi sebelum dashboard Connected Clients dan
database Supabase, serta log/observability Vercel, dapat dipantau. Semua tool
yang mengirim HTTP/WebSocket ke domain produksi menolak berjalan kecuali empat
konfirmasi ini lengkap dan run ID-nya sama:

```dotenv
IZINKAN_PRODUKSI=1
KONFIRMASI_RUN_PRODUKSI=LOADTEST_YYYYMMDDTHHMMSSZ_A1B2C3
OBSERVABILITY_SIAP=1
TIM_SUDAH_DIBERI_TAHU=1
```

Setiap run memakai marker unik dan manifest berisi UUID persis semua customer
dan staf dummy. Cleanup tidak memakai `LIKE 'LT%'`; semua target divalidasi
terhadap manifest sebelum transaksi `DELETE`. Snapshot hanya menyimpan jumlah
baris dan SHA-256 tiap baris—tidak menyimpan password hash, Kode SAP, atau data
bisnis mentah.

## Persiapan dan preview

1. Salin `.env.loadtest.example` menjadi `.env.loadtest`, lalu isi konfigurasi.
2. Jalankan lint, tes, type-check, build, dan pemeriksaan secret.
3. Deploy Vercel Preview dengan konfigurasi produksi, lalu lakukan smoke test
   read-only dan periksa log fungsi. Promosikan build yang sama ke produksi.
4. Buat run ID dan salin nilainya ke `LOADTEST_RUN_ID` serta
   `KONFIRMASI_RUN_PRODUKSI`:

   ```powershell
   npm run loadtest:new-run
   ```

5. Pastikan tim sudah diberi tahu, monitoring terbuka, dan aktivitas bisnis
   telah sepi minimal 10 menit. Preflight juga menolak marker lama dan tenggat
   order yang telah lewat:

   ```powershell
   npm run loadtest:preflight
   npm run loadtest:snapshot
   npm run loadtest:seed
   ```

`loadtest:seed` membuat 200 customer dan 20 staf dummy. Manifest dan cookie ada
di `load-tests/data/target.json` yang diabaikan Git. Untuk pengujian baca lokal
atau staging tanpa seed, `npm run loadtest:target` menulis file terpisah
`target-readonly.json`; gunakan `TARGET_FILE=../data/target-readonly.json`.

## Urutan pengujian

Baseline harus lulus sebelum beban dinaikkan:

```powershell
npm run loadtest:k6 -- leaderboard-read --baseline
npm run loadtest:k6 -- staff-mixed --baseline
```

Profil k6 utama bergerak melalui 25, 50, 100, 150, 180, dan 200 VU:

```powershell
npm run loadtest:k6 -- leaderboard-read
npm run loadtest:k6 -- order-adjust
```

Profil realistis dijalankan di dua terminal pada saat yang sama. Terminal
pertama membuka 180 koneksi customer bertahap; terminal kedua menjalankan 20
staf yang mencari dan check-in:

```powershell
$env:KLIEN='180'; npm run cek:badai
```

```powershell
$env:STAFF_VUS='20'; $env:DURATION='7m'; npm run loadtest:k6 -- staff-mixed
```

Profil batas kuota membuka tepat 200 koneksi tanpa traffic staf atau order:

```powershell
$env:KLIEN='200'; $env:ORDER='0'; npm run cek:badai
```

Uji integritas dan interaksi dilakukan setelah profil utama:

```powershell
npm run loadtest:race
npm run loadtest:burst
npm run loadtest:double-click
npm run loadtest:verify
```

`loadtest:burst` memakai customer dummy berbeda untuk burst 10, 25, dan 50.
`loadtest:double-click` memastikan dua klik sinkron hanya mengirim satu POST dan
menambah tepat satu baris ledger. Endpoint tidak dinyatakan idempoten karena
belum memiliki kontrak idempotency key.

## Stop condition dan cleanup

Hentikan kenaikan beban jika ada 402, `too_many_connections`,
`too_many_joins`, kegagalan integritas, subscription tidak lengkap, error
5xx/429 di atas 1%, p95 di atas 2 detik selama 60 detik, atau CPU/koneksi DB di
atas 80% selama dua menit. CPU dan koneksi harus diawasi dari dashboard selama
tes; runner lokal tidak boleh menebak metrik server yang tidak dimilikinya.

Cleanup wajib dijalankan dalam blok operasional `finally`, bahkan jika tes
gagal:

```powershell
npm run loadtest:reset
npm run loadtest:snapshot -- --banding
```

Reset menampilkan jumlah child/parent, memvalidasi marker + UUID, menghapus
dalam transaksi dengan urutan FK aman, dan membuktikan seluruh ID run tersisa
nol. Perbandingan snapshot membuktikan semua data non-test identik dengan awal.

## Kriteria keputusan

- HTTP: p95 `<500 ms`, p99 `<1.000 ms`, error `<1%`, tanpa 402/5xx.
- Realtime: 200/200 `SUBSCRIBED`, delivery `>=99,9%`, tidak ada koneksi ganda,
  dan semua channel hilang setelah disconnect.
- Database: tidak ada order hilang, total salah/minus, check-in ganda, atau
  perubahan record produksi.

Kesimpulan laporan hanya boleh salah satu:

- `READY FOR 200 CONCURRENT USERS — NO REALTIME HEADROOM ON FREE PLAN`
- `NOT READY FOR 200 CONCURRENT USERS`

Tidak ada stress Realtime di atas 200. Target lebih tinggi memerlukan upgrade
paket atau memindahkan sebagian customer ke polling.
