# Uji Beban & Stress Test

Membuktikan aplikasi aman dipakai 150+ orang bersamaan di malam event, dan
menemukan bug konkurensi di Modul Order **sebelum** event.

## Aturan keras

Uji beban **hanya boleh** ke database staging. `scripts/loadtest-common.ts`
menolak jalan kalau `DATABASE_URL` menunjuk project produksi - aturan ini
ditegakkan kode, bukan sekadar diingat.

Semua data dummy ditandai `LOADTEST` (`kode_sap` berawalan `LT`), sehingga
`npm run loadtest:reset` bisa membuangnya sampai bersih.

## Persiapan

1. Buat project Supabase baru untuk staging.
2. Terapkan seluruh migrasi ke sana:
   ```
   for f in supabase/migrations/*.sql; do DATABASE_URL="<staging>" npm run sql "$f"; done
   ```
3. Salin `.env.loadtest.example` jadi `.env.loadtest`, isi `DATABASE_URL`
   (staging), `AUTH_SECRET` (harus sama dengan server yang diuji), dan
   `BASE_URL` (preview Vercel yang terhubung ke staging).
4. Seed data dummy:
   ```
   npm run loadtest:seed        # 200 toko
   npm run loadtest:seed 500    # atau lebih
   ```
   Ini menulis `load-tests/data/target.json` berisi cookie sesi siap pakai -
   k6 tidak login, karena login aplikasi ini server action, bukan endpoint.

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
npm run loadtest:verify   # WAJIB - kebenaran data, bukan kecepatan
npm run loadtest:reset    # bersihkan data dummy
```

`loadtest:verify` memeriksa tiga hal yang menentukan lulus/tidaknya:
1. tidak ada toko bertotal minus (bukti tidak ada race condition),
2. tidak ada total di bawah pengambilan pertama,
3. tidak ada kehadiran ganda untuk toko yang sama.

## Kriteria lulus

- `http_req_duration` p95 < 500ms, p99 < 1000ms pada 150 VU
- `http_req_failed` < 1%
- `checks` > 99%
- `loadtest:verify` LULUS
- Server tidak mati saat spike 200 VU

## Catatan

Menembak `localhost` hanya mengukur kapasitas laptop, bukan Vercel. Untuk
menyimpulkan "aman di 150 user", sasarannya harus preview Vercel.
