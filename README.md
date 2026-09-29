# Dealer Nite

Aplikasi internal Nippon Paint untuk mengelola Target DN dan pencatatan kehadiran Dealer Night. Backend memakai MySQL 8 dan login password-only untuk tim internal.

## Fitur utama

- Master toko per Dealer Night dari CSV.
- Leaderboard berdasarkan Target DN efektif terbesar dengan format ringkas (`Rp5,62 M`, `Rp905 jt`).
- Penyesuaian Target DN naik atau turun, dengan batas minimum Rp50.000.000.
- Ledger penyesuaian yang menyimpan delta, catatan, waktu, dan pengguna pencatat.
- Pencatatan serta rekap kehadiran dengan `qty_undangan` default 1 per MG Code.
- Akun khusus Dealer Night yang hanya dapat membaca satu DN.
- Polling 10 detik; tidak ada koneksi push atau batas waktu penyesuaian.

## Stack

- Next.js 15, React 19, TypeScript
- MySQL 8, Drizzle ORM, `mysql2`
- Vitest
- Upstash Redis opsional untuk rate limiting

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run seed:dealer-night -- --file "Master_Toko Bogor.csv" --hierarchy-file "public/Hierarchy Depot.csv" --slug bogor --name "DN Bogor"
npm run bootstrap:admin
npm run dev
```

Jika MySQL hanya dapat dicapai lewat SSH, buka tunnel terlebih dahulu lalu arahkan `DATABASE_URL` ke port lokal tunnel:

```bash
ssh -N -L 13306:127.0.0.1:3306 -p <ssh-port> <ssh-user>@<ssh-host>
```

Contoh bentuk URL, tanpa kredensial nyata:

```text
mysql://<user>:<password-yang-sudah-di-url-encode>@127.0.0.1:13306/pylox_dn
```

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan development server di port 3000 |
| `npm run build` | Membuat production build |
| `npm start` | Menjalankan production build |
| `npm test` | Menjalankan seluruh unit dan integration test |
| `npm run lint` | Menjalankan ESLint |
| `npm run db:migrate` | Menerapkan `mysql/migrations/0001_init.sql` |
| `npm run seed:dealer-night -- ...` | Mengimpor atau memperbarui master satu Dealer Night secara idempotent |
| `npm run bootstrap:admin` | Membuat atau memperbarui superadmin pertama dari environment |

## Environment variables

| Key | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ya | URL koneksi MySQL 8 |
| `DB_SSL` | tidak | Set `1` bila server mewajibkan TLS |
| `DB_SSL_CA` | bila TLS memakai CA privat | Sertifikat CA PEM; boleh multiline atau memakai literal `\n` |
| `AUTH_SECRET` | ya | Menandatangani cookie dan menjadi pepper hash password; perubahan nilai membuat password lama tidak cocok |
| `BOOTSTRAP_ADMIN_NAME` | saat bootstrap | Nama superadmin awal |
| `BOOTSTRAP_ADMIN_PASSWORD` | saat bootstrap | Password unik minimal 8 karakter |
| `UPSTASH_REDIS_REST_URL` | tidak | Endpoint rate limiter |
| `UPSTASH_REDIS_REST_TOKEN` | tidak | Token rate limiter |

Jangan menyimpan `.env.local`, kredensial bootstrap, cookie pengujian, atau URL database berisi password ke Git.

## Role dan akses bawaan

| Role | Cakupan DN | Target DN | Kehadiran | User Management |
|---|---|---|---|---|
| `superadmin` | semua DN | lihat dan sesuaikan | catat, lihat, koreksi, unduh | ya |
| `admin` | semua DN | lihat dan sesuaikan | catat, lihat, koreksi, unduh | tidak |
| `marketing` | semua DN | lihat dan unduh | lihat dan unduh | tidak |
| `management` | semua DN | lihat dan unduh | lihat dan unduh | tidak |
| `dn_user` | tepat satu DN | lihat saja | lihat saja | tidak |

Semua akun masuk memakai password unik. Tidak ada login toko. Untuk `dn_user`, `dealer_night_id` wajib terisi dan API tetap menegakkan scope walaupun URL dimanipulasi.

## Data DN Bogor

Sumber master adalah `Master_Toko Bogor.csv`:

- 1 Dealer Night: DN Bogor
- 113 toko unik berdasarkan MG Code
- 81 toko depot-code `1S`
- 32 toko depot-code `5C`
- total Target DN awal Rp42.955.000.000
- `qty_undangan` default 1 untuk setiap toko

Seeder memperbarui baris yang MG Code-nya sudah ada dan menambahkan baris baru tanpa menghapus ledger penyesuaian.

## Model Target DN

`customers.target_dn_awal` adalah nilai awal dari master. Setiap koreksi menambah satu baris `target_adjustments`:

```text
target efektif = target awal + SUM(delta)
```

Form menerima nominal target baru. Service menghitung delta dalam transaksi MySQL dengan row lock, menolak target di bawah Rp50.000.000, lalu menyimpan audit trail. Leaderboard dan ekspor selalu membaca target efektif.

## Database

Migration utama ada di `mysql/migrations/0001_init.sql`. Tabel penting:

- `dealer_nights`
- `profiles`
- `customers`
- `target_adjustments`
- `reservations`
- `depot_pax_targets`
- `app_settings`

Gunakan akun aplikasi dengan privilege minimum pada database aplikasi: `SELECT`, `INSERT`, `UPDATE`, dan `DELETE`. Jalankan migration dengan akun operasional yang juga memiliki `CREATE`, `ALTER`, dan `INDEX`, lalu gunakan akun aplikasi untuk runtime.

## Verifikasi

```bash
npm test
npm run lint
npm run build
```

Sebelum deploy, verifikasi database produksi:

```sql
select count(*) from dealer_nights;
select count(*) from customers;
select depot_code, count(*) from customers group by depot_code;
select sum(target_dn_awal) from customers;
select count(*) from target_adjustments;
```

Nilai awal yang diharapkan: 1 DN, 113 toko, 81/32 per depot-code, total Rp42.955.000.000, dan 0 penyesuaian.

## Deploy

Atur `DATABASE_URL`, `AUTH_SECRET`, serta variabel Upstash opsional di environment deployment. Jangan memakai SSH tunnel sebagai koneksi runtime Vercel; MySQL harus tersedia dari jaringan deployment melalui koneksi terenkripsi, akun runtime berprivilege minimum, dan firewall yang sesuai.

Repository tujuan proyek ini adalah `NP-Sales-Analytics/Dealer-Nite`. Remote lama `Pylox` hanya arsip dan tidak boleh menjadi target push.

Operasional malam acara ada di [RUNBOOK-EVENT.md](./RUNBOOK-EVENT.md).
