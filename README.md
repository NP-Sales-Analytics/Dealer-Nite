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
| `npm run check:overflow` | Cari elemen yang melebihi lebar layar HP: `npm run check:overflow -- <url>` |
| `npm run check:api-load` | Hitung request API per aksi + ukur latensi tiap endpoint |
| `npm run check:load` | Kirim 10/30/60 request bersamaan, laporkan p50/p95 dan kegagalan |

Komponen shadcn `SelectTrigger` membawa `data-[size=default]:h-8`, yang
mengalahkan `h-11` biasa. Untuk menyamakan tingginya dengan input lain, tulis
`data-[size=default]:h-11`, bukan `h-11` saja.

Dua perintah `check:*` memakai Chromium headless lewat `playwright-core` dan butuh
sesi login. Buat cookienya dulu:

```bash
COOKIE_OUT=cookies.txt npx tsx --env-file=.env.local scripts/make-cookie.ts <email> <password>
```

`check:page` menerima `VIEWPORT=375x812` untuk memotret tampilan HP, dan
`check:flow`/`check:page` menerima `BASE_URL` + `COOKIE_FILE` untuk diarahkan ke
produksi.

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

| Role | `/reservation` | `/dashboard` | `/kehadiran` | `/admin/users` | Mendarat di |
|---|---|---|---|---|---|
| `superadmin` | ya | ya | ya (bisa ubah) | ya | `/reservation` |
| `admin_rsvp` | ya | tidak | ya (bisa ubah) | tidak | `/reservation` |
| `rsm` | tidak | ya | ya (lihat saja) | tidak | `/dashboard` |
| `customer` | tidak | tidak | tidak | tidak | `/no-access` |

`/kehadiran` menampilkan daftar toko yang sudah hadir, terpisah dari dashboard
supaya daftar yang bisa ratusan baris tidak memaksa scroll panjang. RSM hanya
memantau; tombol ubah/hapus disembunyikan untuknya dan API menolaknya juga.

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

## Tampilan

Design system diturunkan dari TailAdmin (`design.md`) dengan warna utama indigo
`#465FFF`, font Outfit, dan **light mode saja** — tidak ada toggle, dan
`colorScheme` dipaksa terang supaya kontrol native tidak ikut dark mode OS.

- **Navigasi** memakai shadcn `Sidebar`: menu kiri di desktop, drawer hamburger
  di HP. Daftar menunya difilter per role di `components/shared/app-sidebar.tsx`.
- **Mobile-first.** Target sentuh minimal 44px, dan setiap halaman diuji pada
  375px. Tabel (`user-table`, `recent-checkin-list`) berubah jadi daftar kartu di
  bawah `md` karena 4 kolom tidak muat di layar HP.
- **Logo** ada di `public/logo-nippon.png` (ikon sidebar) dan
  `public/logo-nippon-full.png` (halaman login), sumbernya folder `Icon/`.
  Identitas sidebar dirakit di `components/shared/brand.tsx`.
- **Dua warna referensi digelapkan satu step** karena versi aslinya gagal kontras:
  teks nav aktif `#465FFF` → `#3B50E0` (4.34 → 5.52) dan teks badge sukses
  `#039855` → `#027A48` (3.54 → 5.13). Warna isian tombol tetap `#465FFF`.
- **Konfirmasi memakai `AlertDialog`**, bukan `confirm()` native: popup sistem di
  HP mudah ter-dismiss tak sengaja padahal isinya keputusan menimpa data.
- **Sebaran per depot bukan chart recharts** melainkan baris progress bar
  bernomor, 10 depot per halaman. 36 depot dengan nama panjang tidak terbaca
  sebagai batang sumbu-kategori di layar HP. Panjang bar diskalakan ke jumlah
  hadir tertinggi supaya urutan visual sama dengan urutan peringkat.
- **Daftar toko hadir** (`/kehadiran`) menampilkan 20 catatan per halaman, bisa
  dicari, disaring per region/depot, dan diurutkan menurut waktu datang. Hapus
  berdiri sendiri di baris tabel, bukan di dalam dialog edit - membatalkan
  salah-catat adalah aksi tersering.
- **Tabelnya tidak berubah bentuk di HP.** Susunan kolomnya sama di laptop
  maupun ponsel dan digeser ke kanan bila sempit, supaya urutan kolom yang
  sudah dihafal admin tetap sama di kedua perangkat.
- **Isi dropdown filter diturunkan dari catatan kehadiran**, bukan seluruh
  master data: menampilkan 36 depot padahal baru 7 yang punya tamu membuat
  daftar terasa seolah semua sudah hadir, dan sebagian besar pilihannya dijamin
  nol hasil.
- **Nama customer disimpan huruf besar semua.** Diseragamkan di skema Zod (input
  baru dan edit), parser CSV (seed ulang), dan migrasi `0003` untuk data lama -
  tiga jalur itu semuanya perlu, kalau ada yang terlewat huruf kecil masuk lagi.
- **Filter region mengeluarkan manual entry** karena region hanya ada di master
  data customer. Itu perilaku yang diharapkan, bukan bug.
- **"Toko hadir" hanya menghitung toko terdaftar**, baik di KPI maupun sebaran
  depot. Manual entry adalah tamu di luar daftar undangan; memasukkannya membuat
  jumlah hadir bisa melebihi jumlah diundang. Pax-nya tetap ikut dijumlahkan.

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
- **Cache dashboard** per proses (`lib/ttl-cache.ts` + `lib/dashboard/cache.ts`):
  15 detik untuk agregat, 5 detik untuk daftar kehadiran. Dedup permintaan
  bersamaan membuat cache dingin + banyak admin serentak tetap satu query.
  Setiap penulisan catatan memanggil `bersihkanCacheDashboard()` sehingga admin
  yang baru mengedit langsung melihat hasilnya, tanpa menunggu masa berlaku.
- **Middleware tidak memverifikasi ulang auth untuk `/api`** selama token masih
  lebih dari 10 menit dari kedaluwarsa; sisa berlakunya dibaca dari cookie tanpa
  jaringan. Sebelumnya tiap panggilan API melakukan `auth.getUser()` dua kali
  (middleware + route handler), masing-masing ~128ms round-trip ke Supabase.
  Perpanjangan sesi tetap terjadi di middleware, karena hanya di sanalah cookie
  baru bisa ditulis - route handler tidak bisa menulis cookie.
- **Profil (role) di-cache 60 detik per user.** Identitas tetap diverifikasi
  Supabase tiap request; yang di-cache hanya pemetaan id -> role. Perubahan role
  memanggil `lupakanProfil()` supaya langsung berlaku di instance itu.
- **Rute `/api` menjawab 401, bukan redirect 307** ke halaman login: klien fetch
  butuh status yang bisa dibaca, bukan HTML.

Hasil terukur dari perubahan di atas (lokal, DB di ap-northeast-2):

| | sebelum | sesudah |
|---|---|---|
| `/api/dashboard/summary` | 446ms | 151ms |
| `/api/dashboard/recent` | 797ms | 155ms |
| 60 request bersamaan | - | 1125ms total, 0 gagal |
- **Jam check-in dipaku ke Asia/Jakarta** lewat `Intl`, bukan mengikuti timezone
  perangkat. `checked_in_at` datang sebagai string mentah driver
  (`2026-09-02 06:15:05.88+00`) dan harus di-`new Date()` apa adanya - mengubah
  spasi jadi `T` membuat parser strict dan menghasilkan `Invalid Date`, karena
  offset `+00` tanpa menit bukan ISO valid.
- **Koreksi depot bersifat per-catatan** (`reservations.depot_override`), bukan
  mengubah `customers.depot`. Depot toko berasal dari master data SAP; satu
  koreksi malam event tidak boleh memindahkan toko itu secara permanen untuk
  laporan berikutnya. Urutan pemakaian: `depot_override` -> `customers.depot`
  -> `manual_depot`, dan agregasi per depot mengikuti urutan yang sama.
- **Nama hanya bisa diubah pada manual entry.** Toko terdaftar namanya dari
  master data; API menolak dengan `NAMA_TERKUNCI`.
- **Idempotensi check-in**: unique index parsial di `reservations.customer_id`
  membuat pencatatan ulang meng-update baris yang sama, jadi `sum(qty_hadir)` tidak
  pernah dobel-hitung walau dua admin mencatat toko yang sama bersamaan.

## Data awal

`Data_Awal_Customer.csv` berisi 139 baris; 2 baris terakhir adalah baris kosong dan
baris total dari spreadsheet asal, dan dibuang saat seed. Satu kode SAP (`624628`)
muncul dua kali dan qty-nya dijumlahkan, sehingga hasil akhirnya
**136 toko / 166 orang** — sama dengan total di file aslinya.
