# Pylox — Modul Reservation (Penerimaan Tamu)

Pencatatan kehadiran tamu undangan untuk malam event, plus dashboard rekap real-time.
Modul pertama dari aplikasi yang akan bertambah modulnya (Target, dll).

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local     # lalu isi nilainya (lihat tabel di bawah)
npm run seed                   # import 136 customer dari Data_Awal_Customer.csv
npm run dev
```

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server |
| `npm run build` && `npm start` | Build + jalankan versi produksi |
| `npm test` | 19 unit test (parser CSV, skema Zod, hitungan dashboard) |
| `npm run seed` | Import/refresh data customer. Idempotent — aman dijalankan berulang |
| `npm run check:flow` | Uji alur pencatatan di browser sungguhan (cari → pilih → simpan → duplikat → manual) |
| `npm run check:page` | Screenshot + cek error JS satu halaman: `npm run check:page -- <url> <file.png>` |

Dua perintah `check:*` memakai Chromium headless lewat `playwright-core` dan butuh
sesi login. Buat cookienya dulu:

```bash
COOKIE_OUT=cookies.txt npx tsx --env-file=.env.local scripts/make-cookie.ts <email> <password>
```

**Jangan jalankan `npm run build` selagi `npm start` hidup** — hash chunk di `.next`
berubah di bawah server yang berjalan dan browser gagal memuat chunk. Hentikan
server dulu, build, baru jalankan lagi.

## Environment variables

| Key | Dari mana | Wajib |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | ya |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | ya |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API. **Jangan** beri prefix `NEXT_PUBLIC_` | ya |
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** (port 6543) | ya |
| `UPSTASH_REDIS_REST_URL` | Upstash | tidak |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | tidak |

Dua catatan soal `DATABASE_URL` yang sudah pernah menggigit:

- Buang bracket `[ ]` yang mengelilingi password di string contoh Supabase.
- Kalau password mengandung `@`, `:`, `/`, atau `#`, karakter itu **wajib** di-percent-encode
  (`@` → `%40`). Kalau tidak, parser URL memotong di tempat yang salah dan koneksi gagal.

## Role dan hak akses

| Role | `/reservation` | `/dashboard` | `/admin/users` | Mendarat di |
|---|---|---|---|---|
| `superadmin` | ya | ya | ya | `/reservation` |
| `admin_rsvp` | ya | tidak | tidak | `/reservation` |
| `rsm` | tidak | ya | tidak | `/dashboard` |
| `customer` | tidak | tidak | tidak | `/no-access` |

`customer` disiapkan untuk modul kedua dan belum punya halaman.

### Menambah user

Superadmin membukanya di **User → Tambah User**. Role disimpan di `user_metadata`
saat pembuatan, dan trigger `handle_new_user` menuliskannya ke tabel `profiles`.

Superadmin tidak bisa mengubah role atau menghapus akunnya sendiri, supaya
superadmin terakhir tidak bisa mengunci dirinya keluar.

**Superadmin pertama** (kalau memulai dari database kosong): buat user di Supabase
Dashboard → Authentication → Users, lalu naikkan rolenya:

```sql
update public.profiles set role = 'superadmin' where email = 'email@anda.com';
```

## Mengaktifkan rate limiting

Isi `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN`, lalu redeploy.
Tanpa keduanya, `lib/rate-limit.ts` meloloskan semua request — tidak perlu ubah kode.

## Catatan arsitektur

- **Koneksi DB** lewat Supavisor transaction pooler (`prepare: false`). Pool sengaja
  lebih dari satu koneksi: dengan `max: 1`, satu query tersendat membuat seluruh
  request berikutnya antre dan aplikasi beku sampai proses di-restart.
- **Otorisasi role** dibaca dari tabel `profiles` di server component/route handler
  (`lib/auth.ts`), bukan disalin ke JWT — satu sumber kebenaran.
- **RLS aktif tanpa policy** di ketiga tabel. Aplikasi masuk lewat role `postgres`
  yang punya `BYPASSRLS`, sedangkan anon key yang ter-expose di browser tidak bisa
  membaca apa pun lewat PostgREST. Terverifikasi: anon key maupun JWT user yang
  sah sama-sama mengembalikan `[]`.
- **Pencarian** memakai `word_similarity` (`<%`), bukan `similarity` (`%`). Pada data
  nyata, query pendek melawan nama toko panjang skornya di bawah threshold default
  (`pantalli` vs `PT.PANTALI BERKAH SENTOSA` = 0.259 < 0.3) sehingga typo tidak
  ketemu; `word_similarity` mencocokkan ke potongan terbaik (0.700). Keduanya
  memakai index GIN `gin_trgm_ops` yang sama.
- **Cache dashboard** 15 detik per proses (`lib/dashboard/cache.ts`), dengan dedup
  in-flight sehingga cache dingin + banyak admin serentak tetap satu query.
- **Idempotensi check-in**: unique index parsial di `reservations.customer_id`
  membuat pencatatan ulang meng-update baris yang sama, jadi `sum(qty_hadir)` tidak
  pernah dobel-hitung walau dua admin mencatat toko yang sama bersamaan.

## Data awal

`Data_Awal_Customer.csv` berisi 139 baris; 2 baris terakhir adalah baris kosong dan
baris total dari spreadsheet asal, dan dibuang saat seed. Satu kode SAP (`624628`)
muncul dua kali dan qty-nya dijumlahkan, sehingga hasil akhirnya
**136 toko / 166 orang** — sama dengan total di file aslinya.
