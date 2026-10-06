# Design Tokens: DN Administration System

Sumber: `app/globals.css`, `app/layout.tsx`, `components/ui/*`, `components/shared/*`, serta komponen modul. Aplikasinya **hanya mode terang** (gaya TailAdmin). Semua slide guidebook **wajib** memakai token di bawah. Hex ditulis tanpa `#`, sesuai format pptxgenjs.

## Warna

| Token | Hex | Dipakai untuk |
|---|---|---|
| `primary` | `465FFF` | tombol utama, tab aktif, link, ring fokus, nomor callout |
| `primary-foreground` | `FFFFFF` | teks di atas primary |
| `accent` | `ECF3FF` | latar menu sidebar aktif, chip lembut |
| `accent-foreground` | `3B50E0` | teks menu aktif, avatar inisial |
| `background` | `F9FAFB` | kanvas halaman (latar slide konten) |
| `card` | `FFFFFF` | kartu, tabel, dialog, header, sidebar |
| `foreground` | `1D2939` | judul & teks utama |
| `secondary-foreground` | `344054` | teks sidebar, teks sekunder tebal |
| `muted-foreground` | `667085` | keterangan, label kecil, caption |
| `secondary` / `muted` | `F2F4F7` | latar ikon netral, chip netral, track progress |
| `border` / `input` | `E4E7EC` | garis kartu, garis tabel, input |
| `destructive` | `D92D20` | hapus, error, nilai negatif |
| `chart-1` | `2A78D6` | undangan / kapasitas |
| `chart-2` | `EB6834` | kehadiran aktual |

### Warna status (pill)

| Status | Latar | Teks/Ikon |
|---|---|---|
| Sudah Hadir / Selesai / Terverifikasi / penambahan + | `ECFDF3` (emerald-50) | `027A48` / `047857` |
| Belum Hadir / Belum Verifikasi | `FFFBEB` (amber-50) | `B45309` |
| Perlu Dibuat (kupon) | `F0F9FF` (sky-50) | `0369A1` |
| Siap Diberikan (kupon) | `F5F3FF` (violet-50) | `6D28D9` |
| Kupon Pink | titik `EC4899` | teks `DB2777` |
| Kupon Hijau | titik `10B981` | teks `059669` |
| Nilai negatif | `FEF2F2` | `B91C1C` |

## Tipografi

| Peran | Aplikasi | Di PPT |
|---|---|---|
| Heading & body | **Outfit** (Google Font, geometris) | Heading: **Outfit**, bold/semibold. Body: **Arial** sebagai fallback yang aman, karena Outfit belum tentu terpasang di PC pembaca |
| Angka | `tabular-nums`, bold | Arial bold |
| Judul halaman (header) | 18px semibold, tracking rapat | Judul slide 28–32 pt Outfit bold, warna `foreground` |
| Keterangan header | 12px `muted-foreground` | Subjudul 14–16 pt `muted-foreground` |
| Label grup sidebar | 12px medium, `sidebar-foreground` 70% | Label bagian/eyebrow 12–14 pt, `muted-foreground` |
| Body | 14px | Body 14–16 pt (minimal 14 pt) |

## Radius

`--radius` = 8px (0.5rem).

| Elemen | Radius | Di PPT (`rectRadius`, inci) |
|---|---|---|
| Tombol, input, ikon aksi | `rounded-lg` = 8px | 0.08 |
| Tab, chip kotak | `rounded-xl` ≈ 11–12px | 0.12 |
| Kartu, tabel, dialog, filter bar | `rounded-2xl` = 16px | 0.16 |
| Pill status, badge, avatar | `rounded-full` | setengah tinggi shape |

## Bayangan

- `shadow-xs` = `0 1px 2px rgb(16 24 40 / 0.05)`: hampir tak terlihat, dipakai di semua kartu.
- Di PPT: bayangan luar `color 101828`, `blur 2–3 pt`, `offset 1 pt`, `angle 90`, `opacity 0.08`. Bayangan lebih kuat (`shadow-lg`) hanya untuk elemen mengambang, misalnya bilah aksi massal kupon.

## Komponen

- **Tombol utama**: latar `465FFF`, teks putih, radius 8px, tinggi 44px (`h-11`), font medium 14px, ikon 16px di kiri teks.
- **Tombol outline**: latar `FFFFFF`, border 1px `E4E7EC`, teks `1D2939`.
- **Tombol link**: teks `465FFF`, tanpa latar.
- **Tombol hapus (ikon)**: kotak 40px, border `E4E7EC`, ikon `D92D20`.
- **Card**: latar putih, border 1px `E4E7EC`, radius 16px, `shadow-xs`, padding 16–20px. Kartu KPI berisi ikon dalam kotak `F2F4F7` radius 8px, label 12px muted, nilai 20–30px bold, dan lingkaran blur warna aksen di pojok kanan atas.
- **Tabel**: dibungkus card radius 16px. Header teks 14px medium `1D2939`, baris dengan padding vertikal 16px dan pemisah 1px `E4E7EC`. Kolom nama berisi avatar inisial bulat (`ECF3FF`/`3B50E0`) + nama medium + kode kecil muted. Footer berisi "Menampilkan x–y dari z" dan tombol halaman 36px ber-border.
- **Filter bar**: card radius 16px berisi input cari (ikon kaca pembesar, radius 12px, tinggi 44px) dan dropdown multi-pilih.
- **Tab status (segmented)**: wadah putih ber-border radius 12px; tab aktif berlatar `465FFF` dengan teks putih dan badge hitungan.
- **Pill**: radius penuh, padding 4×10px, 12px semibold, warna sesuai tabel status.
- **Dialog**: card putih radius 16px; header berisi avatar + judul 16px semibold + tombol tutup `X`; panel kanan berlatar `F2F4F7` 25%.
- **Toast**: muncul di tengah atas (sonner, `richColors`).

## Header & sidebar

- **Header**: tinggi 68px, latar putih, garis bawah 1px `E4E7EC`. Isinya judul halaman 18px semibold dan keterangan 12px muted.
- **Sidebar**: lebar 256px (ciut 48px), latar putih, garis kanan `E4E7EC`. Bagian atas berisi logo Nippon + "Nippon / Dealer Nite". Grup menu memakai label kecil muted; item tingginya 44px, ikon 20px, teks 15px. Item aktif berlatar `ECF3FF` dengan teks `3B50E0`. Bagian bawah berisi kartu profil (`F2F4F7` 60%) dengan avatar inisial dan tombol keluar.
- Tombol bulat 24px di tepi sidebar untuk buka/tutup navigasi.

## Aturan penerapan di slide

1. Latar slide konten `F9FAFB`; elemen konten di atas card putih radius 16px + `shadow-xs`.
2. Cover dan pembuka bagian memakai latar `465FFF` dengan teks putih (satu-satunya bidang warna penuh) sebagai "sandwich".
3. Callout nomor pada screenshot: lingkaran `465FFF` dengan angka putih, plus kotak penanda ber-outline `465FFF` 2,25 pt, radius 8px, tanpa isi.
4. Tidak ada garis aksen di bawah judul dan tidak ada stripe di tepi slide/kartu.
5. Footer: kiri berisi judul bagian, kanan berisi nomor slide. Teks 10–11 pt `667085`, tanpa bar warna.
