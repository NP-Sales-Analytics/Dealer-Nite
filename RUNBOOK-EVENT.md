# Runbook Malam Event

Untuk dibaca saat acara berlangsung, bukan saat mengembangkan. Ringkas dan
langsung ke tindakan.

## Sebelum acara dimulai

1. **Kosongkan ledger order** supaya mulai dari nol:
   ```sql
   delete from public.order_adjustments;
   update public.customers set dus_awal = null;
   ```
   `dus_awal` ikut dikosongkan - kalau tidak, lantai pengambilan pertama dari
   data uji akan menghalangi order sungguhan.

2. **Pastikan tenggat penambahan benar** di Setting → Waktu Penambahan. Kalau
   tenggat sudah lewat, semua penambahan ditolak `TENGGAT_HABIS` dan tidak ada
   yang bisa order.

3. **Cek aplikasi hidup**: buka `/leaderboard`, pastikan papan tampil.

## Saat acara berlangsung

### Gejala: leaderboard tidak berubah di device tamu

Aplikasi **sudah otomatis** menangani ini - kalau realtime putus, ia beralih ke
penyegaran tiap 10 detik sendiri. Kalau realtime sehat, penyegaran tiap 30 detik
plus dorongan realtime ~3 detik.

Artinya: **paling lambat 30 detik pun angkanya tetap masuk.** Tidak ada tindakan
darurat yang perlu diambil hanya karena terasa lambat beberapa detik.

Cara memastikan realtime memang hidup - buka Console di browser device mana pun,
jalankan di halaman `/leaderboard`:
```js
// Kalau ada baris "SUBSCRIBED", realtime hidup.
// Kalau "CHANNEL_ERROR"/"TIMED_OUT", ia sudah otomatis polling 10 detik.
```
Atau lebih mudah: catat angka di satu device, tambah order dari device lain,
hitung berapa detik sampai berubah. Di bawah 30 detik = normal.

### Gejala: order gagal disimpan

Baca pesan errornya - aplikasi menyebut alasannya secara spesifik:

| Pesan | Artinya | Tindakan |
|---|---|---|
| `TENGGAT_HABIS` | Waktu penambahan sudah lewat | Perpanjang di Setting → Waktu Penambahan, atau koreksi lewat Detail Order (tidak tunduk tenggat) |
| `DI_BAWAH_AWAL` | Angka lebih rendah dari pengambilan pertama | Koreksi lewat Detail Order - admin adalah otoritas |
| `NEGATIVE` | Total akan jadi minus | Angkanya memang salah, periksa ulang |
| `Terlalu banyak permintaan` (429) | Rate limit 40 request / 10 detik per akun | Tunggu 10 detik. Kalau sering terjadi di meja registrasi, bagi beban ke akun admin lain |

### Gejala: aplikasi lambat menyeluruh

Sudah diuji sampai 200 pengguna bersamaan tanpa error (lihat tabel di bawah).
Kalau tetap lambat:

1. Cek status Vercel dan Supabase - kemungkinan besar bukan aplikasinya.
2. Jangan restart apa pun tanpa alasan jelas; tidak ada proses yang perlu
   di-restart di arsitektur ini.

### Yang TIDAK boleh dilakukan saat acara

- **Jangan** jalankan skrip mana pun di `scripts/loadtest-*` atau `cek-badai`.
  Semuanya menulis atau membebani database produksi.
- **Jangan** hapus customer dari Detail Order kecuali yakin - penghapusan ikut
  membuang seluruh riwayat order dan kehadirannya (cascade).

## Kapasitas yang sudah terbukti

Diukur langsung ke produksi, 7 September 2026:

| Uji | Hasil |
|---|---|
| Baca 150 VU | p95 189 ms, nol error |
| Tulis 150 VU | p95 414 ms, nol error |
| Gabungan baca+tulis (~300 VU) | tulis p95 421 ms, baca p95 158 ms, nol error |
| Spike 200 VU, 12 menit | p95 410 ms, p99 483 ms, nol error, 30.752/30.752 cek |
| Badai realtime 150 koneksi | 150/150 tersambung, p95 247 ms, puncak 96 req/detik |
| Koneksi Realtime bersamaan | 300/300 tersambung |
| Kebenaran data di bawah beban | Nol toko minus, nol di bawah lantai, nol kehadiran ganda |

Ambang yang dipakai: p95 < 500 ms, p99 < 1000 ms, error < 1%.
