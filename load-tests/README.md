# Uji Beban & Stress Test

Membuktikan aplikasi aman dipakai 150+ orang bersamaan di malam event, dan
menemukan bug konkurensi di Modul Order **sebelum** event.

## Aturan keras

Sasaran uji beban **seharusnya** database staging. `scripts/loadtest-common.ts`
menolak jalan kalau `DATABASE_URL` menunjuk project produksi - pengaman itu
ditegakkan kode, bukan sekadar diingat.

Menembak produksi hanya boleh sebagai keputusan sadar pemilik data, dengan
mengisi `IZINKAN_PRODUKSI=1` di `.env.loadtest`. Konsekuensinya nyata dan tidak
bisa dihilangkan:

- selama tes berjalan, papan Top Spender dan dashboard menampilkan toko dummy
  bernama `LOADTEST TOKO n` ke siapa pun yang membuka situs;
- beban 150-200 VU bisa memperlambat pengguna sungguhan yang sedang online.

Karena itu: jalankan di jam sepi, beritahu tim lebih dulu, dan **verifikasi
pembersihannya** - jangan hanya dijalankan lalu dipercaya.

Semua data dummy ditandai `LOADTEST` (`kode_sap` berawalan `LT`), sehingga
`npm run loadtest:reset` bisa membuangnya sampai bersih.

## Persiapan

1. Salin `.env.loadtest.example` jadi `.env.loadtest`, isi `DATABASE_URL`,
   `AUTH_SECRET` (harus sama dengan server yang diuji), dan `BASE_URL`.
2. Kalau sasarannya staging: terapkan seluruh migrasi ke sana lebih dulu.
   ```
   for f in supabase/migrations/*.sql; do DATABASE_URL="<staging>" npm run sql "$f"; done
   ```
3. Rekam keadaan awal - ini yang nanti membuktikan tidak ada jejak tertinggal:
   ```
   npm run loadtest:snapshot
   ```
4. Seed data dummy:
   ```
   npm run loadtest:seed        # 200 toko + 20 staff
   npm run loadtest:seed 500    # atau lebih
   ```
   Ini menulis `load-tests/data/target.json` berisi cookie sesi siap pakai -
   k6 tidak login, karena login aplikasi ini server action, bukan endpoint.

   Akun staff dibuat **banyak** dan bersandi **acak**. Banyak, karena rate
   limiter dikunci per user (40 request / 10 detik): satu akun untuk 150 VU
   hanya akan mengukur rate limiternya. Acak, karena login aplikasi ini
   password-saja dan `password_hash` adalah pengenalnya - hash yang bisa ditebak
   sama artinya dengan memasang akun superadmin bersandi tetap di database.

   Untuk uji **baca** saja, tidak perlu seed: `npm run loadtest:target` menyusun
   `target.json` dari toko yang sudah ada, murni `select`, tanpa menulis apa pun.

## Menjalankan

**Uji konkurensi lebih dulu** - ini yang paling menentukan, dan tidak butuh k6:

```
BASE_URL=<preview> npm run loadtest:race
```

Lalu profil beban bertahap (30 -> 150 -> 200 VU):

```
k6 run -e BASE_URL=<preview> load-tests/scenarios/leaderboard-read.js
k6 run -e BASE_URL=<preview> load-tests/scenarios/order-adjust.js
k6 run -e BASE_URL=<preview> load-tests/scenarios/search.js
k6 run -e BASE_URL=<preview> load-tests/scenarios/checkin.js
```

Tambahkan `-e SINGKAT=1` untuk profil pendek (~80 detik) saat memeriksa cepat.

Skenario terberat dijalankan **bersamaan** untuk meniru kondisi nyata:

```
k6 run -e BASE_URL=<preview> load-tests/scenarios/order-adjust.js &
k6 run -e BASE_URL=<preview> load-tests/scenarios/leaderboard-read.js
```

## Setelah selesai

```
npm run loadtest:verify              # WAJIB - kebenaran data, bukan kecepatan
npm run loadtest:reset               # bersihkan data dummy
npm run loadtest:snapshot -- --banding   # BUKTIKAN bersih
```

`loadtest:verify` memeriksa tiga hal yang menentukan lulus/tidaknya:
1. tidak ada toko bertotal minus (bukti tidak ada race condition),
2. tidak ada total di bawah pengambilan pertama,
3. tidak ada kehadiran ganda untuk toko yang sama.

`loadtest:snapshot -- --banding` memeriksa dua hal yang menentukan aman/tidaknya
menembak database berisi data nyata:
1. tidak ada baris dummy tersisa,
2. baris yang **bukan** dummy masih persis sama dengan sebelum tes - inilah yang
   paling berbahaya kalau terlewat, karena sisa yang tertinggal masih kelihatan,
   sedangkan baris asli yang ikut berubah tidak.

## Kriteria lulus

- `http_req_duration` p95 < 500ms, p99 < 1000ms pada 150 VU
- `http_req_failed` < 1%
- `checks` > 99%
- `loadtest:verify` LULUS
- Server tidak mati saat spike 200 VU

## Catatan

Menembak `localhost` hanya mengukur kapasitas laptop, bukan Vercel. Untuk
menyimpulkan "aman di 150 user", sasarannya harus preview Vercel.

## Region fungsi

`vercel.json` mengunci fungsi ke `icn1` (Seoul) - SAMA dengan region database
(`aws-0-ap-northeast-2`). Ini pilihan sadar sesudah mengukur, bukan bawaan:

Sempat dicoba `sin1` (Singapura) lebih dulu dengan alasan "sesudah cache
diperbaiki, sebagian besar baca sudah tidak menyentuh DB, jadi kedekatan ke
pengguna lebih penting". Itu benar untuk jalur BACA - tapi uji jalur TULIS
membuka bahwa alasannya tidak berlaku untuk jalur TULIS: setiap penulisan
order tetap wajib menyentuh database, dan diagnostik Server-Timing
membuktikan tiap round trip fungsi -> DB memakan ~140ms saat keduanya beda
region (Singapura -> Seoul). Satu transaksi order-adjust melakukan 4 round
trip (lock, select gabungan, insert, commit) = ~570ms HANYA untuk bagian DB,
sebelum dihitung antrean pool sama sekali.

Sesudah pindah ke icn1: round trip fungsi -> DB turun ke orde milidetik
tunggal (satu region jaringan Vercel/AWS yang sama), dan bagian DB dari
transaksi turun drastis. Konsekuensinya: /api/order/me (yang TIDAK di-cache
CDN, selalu menyentuh fungsi) sedikit lebih jauh dari pengguna Indonesia
dibanding Singapura - dan sejak podium ikut disajikan dari /api/order/me,
seluruh jalur baca customer memang sampai ke fungsi, tidak ada lagi yang
dibantu CDN. Itu disengaja: podium dan posisi pribadi harus berasal dari satu
snapshot yang sama, dan cache CDN 15-45 detik justru yang dulu membuat keduanya
menyebut angka berbeda di layar yang sama.

Kalau nanti databasenya pindah region, region fungsi ini harus disesuaikan
ulang - dan diukur ulang, bukan ditebak.
