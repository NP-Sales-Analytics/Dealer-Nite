// Builder PPT "Guideline Book" DN Administration System.
//
//   NODE_PATH=<folder berisi pptxgenjs, react-icons, react, react-dom, sharp> \
//   PPTX_SKILL=<folder skill pptx, untuk scripts/apply_theme.js> \
//   node docs/guidebook/build-deck.js
//
// Semua warna/font/radius mengikuti docs/guidebook/design-tokens.md.
// Screenshot dibaca dari docs/guidebook/screens/ (hasil capture.js).
const path = require('path');
const pptxgen = require('pptxgenjs');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const sharp = require('sharp');
const lu = require('react-icons/lu');

const ROOT = path.resolve(__dirname, '../..');
const SCREENS = path.join(__dirname, 'screens');
const OUT = process.env.GUIDE_OUT || path.join(__dirname, 'Guidebook-DN-Administration-System.pptx');
const VERSI = 'Versi 1.0 · 5 Oktober 2026';
const KONTAK = '[ISI KONTAK / PIC]';

// ---- Token (design-tokens.md)
const T = {
  primary: '465FFF', primaryDark: '3B50E0', accent: 'ECF3FF', bg: 'F9FAFB', card: 'FFFFFF',
  fg: '1D2939', fg2: '344054', muted: '667085', secondary: 'F2F4F7', border: 'E4E7EC', red: 'D92D20',
  greenBg: 'ECFDF3', green: '027A48', amberBg: 'FFFBEB', amber: 'B45309', redBg: 'FEF2F2',
  skyBg: 'F0F9FF', sky: '0369A1', violetBg: 'F5F3FF', violet: '6D28D9', pink: 'EC4899', emerald: '10B981',
};
const H = 'Outfit';
const B = 'Arial';
const R = { ctrl: 0.08, xl: 0.12, card: 0.16 };
const W = 13.333;

const THEME = {
  name: 'DN Administration System',
  headFontFace: H,
  bodyFontFace: B,
  colors: {
    dk1: T.fg, lt1: 'FFFFFF', dk2: T.fg2, lt2: T.bg,
    accent1: T.primary, accent2: T.primaryDark, accent3: '2A78D6', accent4: 'EB6834', accent5: T.green, accent6: T.red,
    hlink: T.primary, folHlink: T.primaryDark,
  },
};

// ---- Ikon lucide (sama dengan aplikasi) -> PNG
const cacheIkon = new Map();
async function ikon(nama, warna) {
  const key = nama + warna;
  if (!cacheIkon.has(key)) {
    const svg = renderToStaticMarkup(React.createElement(lu[nama], { color: '#' + warna, size: 256 }));
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    cacheIkon.set(key, 'image/png;base64,' + buf.toString('base64'));
  }
  return cacheIkon.get(key);
}

// Screenshot (opsional di-crop, dalam piksel 1440x900) -> data URI + ukuran
async function gambar(file, crop) {
  let img = sharp(path.join(SCREENS, file));
  if (crop) img = img.extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] });
  const buf = await img.png().toBuffer();
  const meta = await sharp(buf).metadata();
  return { data: 'image/png;base64,' + buf.toString('base64'), w: meta.width, h: meta.height };
}

const bayangan = () => ({ type: 'outer', color: '101828', opacity: 0.08, blur: 3, offset: 1, angle: 90 });

function kartu(slide, x, y, w, h, opt = {}) {
  slide.addShape('roundRect', {
    x, y, w, h, rectRadius: opt.radius ?? R.card,
    fill: { color: opt.fill ?? T.card }, line: { color: opt.line ?? T.border, width: 0.75, dashType: opt.dash },
    shadow: opt.flat ? undefined : bayangan(), objectName: opt.name,
  });
}

function teks(slide, text, o) {
  slide.addText(text, { isTextBox: true, margin: 0, fontFace: B, fontSize: 15, color: T.fg, valign: 'top', ...o });
}

function bulatan(slide, n, x, y, d = 0.42, warna = T.primary) {
  slide.addShape('ellipse', { x, y, w: d, h: d, fill: { color: warna }, line: { color: 'FFFFFF', width: 1.5 } });
  slide.addText(String(n), {
    isTextBox: true, x, y, w: d, h: d, margin: 0, align: 'center', valign: 'middle',
    fontFace: H, fontSize: 14, bold: true, color: 'FFFFFF',
  });
}

async function kotakIkon(slide, nama, x, y, s, warnaIkon = T.primary, latar = T.accent) {
  slide.addShape('roundRect', { x, y, w: s, h: s, rectRadius: R.xl, fill: { color: latar }, line: { color: latar, width: 0 } });
  const p = s * 0.24;
  slide.addImage({ data: await ikon(nama, warnaIkon), x: x + p, y: y + p, w: s - 2 * p, h: s - 2 * p });
}

function pill(slide, text, x, y, w, latar, warna, size = 14) {
  slide.addShape('roundRect', { x, y, w, h: 0.38, rectRadius: 0.19, fill: { color: latar }, line: { color: latar, width: 0 } });
  teks(slide, text, { x, y, w, h: 0.38, align: 'center', valign: 'middle', fontSize: size, bold: true, color: warna });
}

function panah(slide, x1, y1, x2, y2, warna = T.muted) {
  slide.addShape('line', {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.001, h: Math.abs(y2 - y1) || 0.001,
    flipH: x2 < x1, flipV: y2 < y1, line: { color: warna, width: 1.75, endArrowType: 'triangle' },
  });
}

// ---- Layout (pptxgenjs menyebutnya "slide master"; di PowerPoint jadi layout)
function defineLayouts(pres) {
  pres.defineSlideMaster({
    title: 'COVER',
    background: { color: T.primary },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 2.35, w: 7.4, h: 1.5, fontFace: H, fontSize: 46, bold: true, color: 'FFFFFF', valign: 'top', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.8, y: 3.95, w: 7.4, h: 0.6, fontFace: H, fontSize: 24, color: 'FFFFFF', valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
  });
  pres.defineSlideMaster({
    title: 'SECTION',
    background: { color: T.primary },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.8, y: 2.75, w: 7.6, h: 1.1, fontFace: H, fontSize: 44, bold: true, color: 'FFFFFF', valign: 'top', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.8, y: 3.95, w: 7.0, h: 0.9, fontFace: B, fontSize: 18, color: 'FFFFFF', valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: { x: 12.2, y: 6.95, w: 0.6, h: 0.3, fontFace: B, fontSize: 11, color: 'FFFFFF', align: 'right' },
  });
  pres.defineSlideMaster({
    title: 'CONTENT',
    background: { color: T.bg },
    objects: [
      { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.38, w: 12.1, h: 0.62, fontFace: H, fontSize: 30, bold: true, color: T.fg, valign: 'top', align: 'left', margin: 0 }, text: '' } },
      { placeholder: { options: { name: 'body', type: 'body', x: 0.6, y: 1.0, w: 12.1, h: 0.4, fontFace: B, fontSize: 15, color: T.muted, valign: 'top', align: 'left', margin: 0 }, text: '' } },
    ],
    slideNumber: { x: 12.2, y: 6.95, w: 0.6, h: 0.3, fontFace: B, fontSize: 11, color: T.muted, align: 'right' },
  });
}

function footer(slide, bagian, gelap = false) {
  teks(slide, `DN Administration System  ·  ${bagian}`, {
    x: 0.6, y: 6.95, w: 8, h: 0.3, fontSize: 11, color: gelap ? 'FFFFFF' : T.muted, valign: 'middle',
  });
}

function konten(pres, bagian, judul, sub, notes) {
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: bagian });
  s.addText(judul, { placeholder: 'title' });
  if (sub) s.addText(sub, { placeholder: 'body' });
  footer(s, bagian);
  s.addNotes(notes);
  return s;
}

// ---- Layout "teks + screenshot": kiri langkah bernomor, kanan screenshot bercallout
async function langkah(pres, bagian, { judul, sub, file, crop, steps, callouts = [], tags = [], tip, notes }) {
  const s = konten(pres, bagian, judul, sub, notes);

  // Kiri: langkah. Satu baris judul tebal + (opsional) satu baris penjelasan.
  let y = 1.75;
  for (const st of steps) {
    bulatan(s, st.n, 0.6, y);
    const runs = [{ text: st.t, options: { bold: true, breakLine: !!st.d } }];
    if (st.d) runs.push({ text: st.d, options: { color: T.muted } });
    const tinggi = st.d ? 1.05 : 0.62;
    teks(s, runs, { x: 1.17, y: y + 0.02, w: 3.45, h: tinggi, fontSize: 15, paraSpaceAfter: 2 });
    y += tinggi + 0.35;
  }

  // Kanan: screenshot dalam bingkai card, contain di area 7.73 x 4.95
  const img = await gambar(file, crop);
  const boxX = 5.0; const boxY = 1.6; const boxW = 7.73; const boxH = 4.95;
  const skala = Math.min(boxW / img.w, boxH / img.h);
  const w = img.w * skala; const h = img.h * skala;
  const x = boxX + (boxW - w) / 2; const yy = boxY; // rata atas, sejajar langkah pertama
  kartu(s, x - 0.08, yy - 0.08, w + 0.16, h + 0.16, { radius: R.card, name: 'Bingkai screenshot' });
  s.addImage({ data: img.data, x, y: yy, w, h, altText: judul });

  const px = (v, ox) => (v - ox) * skala;
  const ox = crop ? crop[0] : 0; const oy = crop ? crop[1] : 0;
  for (const c of callouts) {
    const [cx, cy, cw, ch] = c.box;
    const bx = x + px(cx, ox); const by = yy + px(cy, oy);
    s.addShape('roundRect', {
      x: bx, y: by, w: cw * skala, h: ch * skala, rectRadius: R.ctrl,
      fill: { type: 'none' }, line: { color: T.primary, width: 2.25 }, objectName: `Callout ${c.n}`,
    });
    // Nomor di samping kotak (bukan di sudutnya) supaya tidak menutupi label UI.
    // Kiri bila muat sebelum kolom teks, selain itu kanan; 'top'/'topright' untuk
    // kotak yang sisinya berimpit dengan elemen lain.
    const d = 0.4; const g = 0.08; const bw = cw * skala; const bh = ch * skala;
    let pos = c.pos || 'left';
    if (pos === 'left' && bx - g - d < 4.5) pos = 'right';
    const [nx, ny] = {
      left: [bx - g - d, by + bh / 2 - d / 2],
      right: [bx + bw + g, by + bh / 2 - d / 2],
      top: [bx + 0.1, by - d - g],
      topright: [bx + bw - d - 0.1, by - d - g],
    }[pos];
    bulatan(s, c.n, nx, ny, d);
  }
  for (const t of tags) {
    pill(s, t.text, x + px(t.at[0], ox), yy + px(t.at[1], oy), t.w, T.fg, 'FFFFFF');
  }
  // Screenshot lebar menyisakan ruang di bawahnya: isi dengan satu tips.
  if (tip) {
    const ty = yy + h + 0.4;
    kartu(s, x - 0.08, ty, w + 0.16, 0.95, { fill: T.amberBg, line: 'FDE68A', flat: true });
    await kotakIkon(s, 'LuLightbulb', x + 0.15, ty + 0.2, 0.55, T.amber, 'FFFFFF');
    teks(s, tip, { x: x + 0.9, y: ty + 0.2, w: w - 1.1, h: 0.55, fontSize: 15, color: T.fg2, valign: 'middle' });
  }
  return s;
}

async function pembukaBagian(pres, bagian, { label, judul, desc, ikonNama, halaman, notes }) {
  const s = pres.addSlide({ masterName: 'SECTION', sectionTitle: bagian });
  teks(s, label.toUpperCase(), { x: 0.8, y: 2.2, w: 6, h: 0.4, fontFace: H, fontSize: 16, bold: true, color: 'C7D2FE', charSpacing: 2 });
  s.addText(judul, { placeholder: 'title' });
  s.addText(desc, { placeholder: 'body' });
  let x = 0.8;
  for (const h of halaman) {
    const w = 0.42 + h.length * 0.105;
    pill(s, h, x, 5.05, w, '5A70FF', 'FFFFFF');
    x += w + 0.15;
  }
  s.addShape('ellipse', { x: 9.0, y: 1.75, w: 3.6, h: 3.6, fill: { color: '5A70FF' }, line: { color: '5A70FF', width: 0 } });
  s.addImage({ data: await ikon(ikonNama, 'FFFFFF'), x: 10.0, y: 2.75, w: 1.6, h: 1.6 });
  footer(s, bagian, true);
  s.addNotes(notes);
}

// Kartu fitur: ikon + judul + 1 kalimat
async function kartuFitur(s, x, y, w, h, ikonNama, judul, isi) {
  kartu(s, x, y, w, h);
  await kotakIkon(s, ikonNama, x + 0.3, y + 0.3, 0.6);
  teks(s, judul, { x: x + 0.3, y: y + 1.08, w: w - 0.6, h: 0.4, fontFace: H, fontSize: 19, bold: true });
  teks(s, isi, { x: x + 0.3, y: y + 1.52, w: w - 0.6, h: h - 1.7, fontSize: 15, color: T.fg2 });
}

// Layout tips: dua kartu Tips / Hindari
async function slideTips(pres, bagian, { judul, sub, tips, hindari, notes }) {
  const s = konten(pres, bagian, judul, sub, notes);
  const kolom = [
    [0.6, 'LuLightbulb', 'Tips', 'LuCheck', T.greenBg, T.green, tips],
    [6.82, 'LuTriangleAlert', 'Hindari', 'LuX', T.redBg, T.red, hindari],
  ];
  for (const [x, ik, label, ikButir, latar, warna, isi] of kolom) {
    kartu(s, x, 1.7, 5.91, 4.75);
    await kotakIkon(s, ik, x + 0.35, 2.0, 0.7, warna, latar);
    teks(s, label, { x: x + 1.25, y: 2.12, w: 4, h: 0.45, fontFace: H, fontSize: 22, bold: true });
    let y = 3.15;
    for (const t of isi) {
      await kotakIkon(s, ikButir, x + 0.35, y, 0.42, warna, latar);
      teks(s, t, { x: x + 0.95, y: y + 0.02, w: 4.7, h: 0.8, fontSize: 16, color: T.fg2 });
      y += 1.05;
    }
  }
}

// Node diagram alur
async function node(s, x, y, w, h, ikonNama, label, opt = {}) {
  kartu(s, x, y, w, h, { fill: opt.fill, line: opt.line, dash: opt.dash });
  await kotakIkon(s, ikonNama, x + (w - 0.56) / 2, y + 0.22, 0.56, opt.ikon ?? T.primary, opt.latar ?? T.accent);
  teks(s, label, { x: x + 0.12, y: y + 0.9, w: w - 0.24, h: h - 1.0, fontSize: 14, bold: true, align: 'center' });
}

// =========================================================================
async function build() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = 'Guideline Book DN Administration System';
  pres.subject = 'Panduan Penggunaan untuk Admin DN';
  pres.author = 'Sales Analytics';
  pres.company = 'Nippon Paint';
  pres.theme = { headFontFace: H, bodyFontFace: B };
  defineLayouts(pres);

  // ---------------- PEMBUKA
  const P = 'Pembuka';
  pres.addSection({ title: P });
  {
    const s = pres.addSlide({ masterName: 'COVER', sectionTitle: P });
    teks(s, 'GUIDELINE BOOK', { x: 0.8, y: 1.85, w: 6, h: 0.4, fontFace: H, fontSize: 16, bold: true, color: 'C7D2FE', charSpacing: 2 });
    s.addText('DN Administration System', { placeholder: 'title' });
    s.addText('Panduan Penggunaan', { placeholder: 'body' });
    pill(s, 'Untuk Admin DN', 0.8, 4.85, 2.1, '5A70FF', 'FFFFFF');
    teks(s, VERSI, { x: 0.8, y: 5.45, w: 6, h: 0.35, fontSize: 15, color: 'E0E7FF' });
    teks(s, 'dn.bi-nipponpaint.com', { x: 0.8, y: 6.55, w: 6, h: 0.35, fontSize: 14, color: 'C7D2FE' });
    kartu(s, 8.75, 2.2, 3.8, 3.1, { line: 'FFFFFF' });
    s.addImage({ path: path.join(ROOT, 'public/logo-nippon-full.png'), x: 9.15, y: 3.15, w: 3.0, h: 3.0 * 681 / 2288, altText: 'Logo Nippon Paint' });
    teks(s, 'Dealer Nite', { x: 8.75, y: 4.3, w: 3.8, h: 0.4, fontFace: H, fontSize: 18, bold: true, color: T.fg, align: 'center' });
    s.addNotes('Selamat datang di panduan DN Administration System. Dokumen ini menjelaskan cara memakai sistem dari login sampai mengelola kupon, khusus untuk Admin DN. Versi dan tanggal ada di bawah judul; pastikan Anda memakai versi terbaru.');
  }

  {
    const s = konten(pres, P, 'Tujuan & cara membaca dokumen ini', 'Baca berurutan saat pertama kali; selanjutnya cukup buka modul yang dibutuhkan.',
      'Panduan ini punya tiga tujuan: membuat Admin DN bisa bekerja mandiri, menyamakan cara kerja di semua DN, dan mengurangi salah input. Setiap langkah ditandai nomor biru; nomor yang sama muncul di screenshot sebagai penanda area yang diklik atau diisi. Kotak tips berisi hal yang sering terlewat.');
    await kartuFitur(s, 0.6, 1.7, 3.85, 2.75, 'LuTarget', 'Tujuan', 'Admin DN bisa mencatat kehadiran, memverifikasi target, dan mengelola kupon secara mandiri.');
    await kartuFitur(s, 4.74, 1.7, 3.85, 2.75, 'LuUsers', 'Untuk siapa', 'Admin DN yang bertugas di malam Dealer Night dan sesudahnya.');
    await kartuFitur(s, 8.88, 1.7, 3.85, 2.75, 'LuBookOpen', 'Isi', 'Login, Modul Kehadiran, Detail Target DN, Detail Kupon, lalu FAQ.');
    // Legenda
    kartu(s, 0.6, 4.75, 12.13, 1.85);
    teks(s, 'Cara membaca', { x: 0.9, y: 4.98, w: 3, h: 0.35, fontFace: H, fontSize: 17, bold: true });
    bulatan(s, 1, 0.9, 5.55);
    teks(s, 'Nomor langkah', { x: 1.45, y: 5.6, w: 2.6, h: 0.35, fontSize: 15 });
    s.addShape('roundRect', { x: 4.4, y: 5.5, w: 0.75, h: 0.5, rectRadius: R.ctrl, fill: { type: 'none' }, line: { color: T.primary, width: 2.25 } });
    teks(s, 'Area yang diklik / diisi', { x: 5.35, y: 5.6, w: 3.0, h: 0.35, fontSize: 15 });
    await kotakIkon(s, 'LuLightbulb', 8.7, 5.47, 0.56, T.amber, T.amberBg);
    teks(s, 'Tips & kesalahan umum', { x: 9.45, y: 5.6, w: 3.1, h: 0.35, fontSize: 15 });
  }

  {
    const s = konten(pres, P, 'Gambaran umum sistem', 'Satu sistem untuk seluruh malam Dealer Night: dari tamu datang sampai kupon diberikan.',
      'Alurnya dimulai dari tim pusat yang mengunggah master toko beserta Target Pusat. Saat acara, Admin DN mencatat kehadiran tamu. Setelah itu target tiap toko diverifikasi, dan bila ada penambahan dicatat sebagai penyesuaian. Dari target terverifikasi, sistem menghitung hak kupon yang kemudian dibuat dan diberikan. Semua data bisa dipantau di dashboard dan leaderboard, diperbarui otomatis setiap 10 detik.');
    const nodes = [
      ['LuStore', 'Master toko & Target Pusat'],
      ['LuClipboardCheck', 'Catat kehadiran'],
      ['LuBadgeCheck', 'Verifikasi Target DN'],
      ['LuSlidersHorizontal', 'Penyesuaian target'],
      ['LuPrinter', 'Buat kupon'],
      ['LuPackageCheck', 'Berikan kupon'],
    ];
    const w = 1.72; const gap = 0.36; const y = 1.75; const h = 1.75;
    for (let i = 0; i < nodes.length; i++) {
      const x = 0.6 + i * (w + gap);
      await node(s, x, y, w, h, nodes[i][0], nodes[i][1], i === 0 ? { fill: T.secondary, ikon: T.fg2, latar: 'FFFFFF', dash: 'dash' } : {});
      if (i < nodes.length - 1) panah(s, x + w + 0.04, y + h / 2, x + w + gap - 0.04, y + h / 2);
    }
    // Pengelompokan modul di bawah node
    const grup = [
      [0, 0, 'Tim Pusat', T.secondary, T.fg2],
      [1, 1, 'Modul A', T.accent, T.primaryDark],
      [2, 3, 'Modul B · Target DN', T.greenBg, T.green],
      [4, 5, 'Modul C · Kupon', T.violetBg, T.violet],
    ];
    for (const [a, b, label, latar, warna] of grup) {
      const x = 0.6 + a * (w + gap);
      pill(s, label, x, 3.7, (b - a + 1) * w + (b - a) * gap, latar, warna);
    }
    // Pemantauan
    kartu(s, 0.6, 4.6, 12.13, 1.55);
    await kotakIkon(s, 'LuChartColumn', 0.95, 5.0, 0.75);
    teks(s, 'Pantau kapan saja', { x: 1.95, y: 4.92, w: 6, h: 0.4, fontFace: H, fontSize: 19, bold: true });
    teks(s, 'Dashboard Kehadiran, Detail Toko Hadir, dan Leaderboard Target DN diperbarui otomatis tiap 10 detik.', { x: 1.95, y: 5.38, w: 10.4, h: 0.5, fontSize: 15, color: T.fg2 });
  }

  {
    const s = konten(pres, P, 'Role & hak akses', 'Menu yang tampil mengikuti izin halaman tiap akun, diatur Super Admin di User Management.',
      'Ada lima role. Admin DN, baris yang disorot, punya akses penuh untuk mencatat dan mengoreksi kehadiran, memverifikasi dan menyesuaikan target, serta membuat dan memberikan kupon. Marketing, Management, dan Akun DN hanya melihat. Akun DN dibatasi pada satu Dealer Night dan tidak bisa mengunduh data. Jika menu yang Anda butuhkan tidak muncul, minta Super Admin menambahkan izinnya.');
    const head = (t) => ({ text: t, options: { bold: true, color: T.fg, fill: { color: T.secondary }, fontFace: H } });
    const sel = (t, o = {}) => ({ text: t, options: { color: T.fg2, ...o } });
    const sorot = { fill: { color: T.accent }, color: T.primaryDark, bold: true };
    const rows = [
      [head('Role'), head('Kehadiran'), head('Detail Target DN'), head('Detail Kupon'), head('Unduh data')],
      [sel('Super Admin', { bold: true, color: T.fg }), sel('Catat, ubah, hapus'), sel('Verifikasi & sesuaikan'), sel('Buat & berikan'), sel('Ya')],
      [sel('Admin DN', sorot), sel('Catat, ubah, hapus', sorot), sel('Verifikasi & sesuaikan', sorot), sel('Buat & berikan', sorot), sel('Ya', sorot)],
      [sel('Marketing / Management', { bold: true, color: T.fg }), sel('Lihat'), sel('Lihat'), sel('Lihat'), sel('Ya')],
      [sel('Akun DN', { bold: true, color: T.fg }), sel('Lihat (1 DN)'), sel('Lihat'), sel('Lihat'), sel('Tidak')],
    ];
    kartu(s, 0.6, 1.7, 12.13, 3.9);
    s.addTable(rows, {
      x: 0.75, y: 1.85, w: 11.83, colW: [2.75, 2.4, 2.75, 2.2, 1.73], rowH: 0.7,
      fontFace: B, fontSize: 15, valign: 'middle', margin: [0, 0.18, 0, 0.18],
      border: { type: 'solid', color: T.border, pt: 0.75 },
    });
    await kotakIkon(s, 'LuShieldCheck', 0.6, 5.95, 0.56);
    teks(s, 'Menu Setting (User Management) hanya untuk Super Admin dan tidak dibahas di panduan ini.', { x: 1.35, y: 6.05, w: 11, h: 0.4, fontSize: 15, color: T.fg2 });
  }

  await langkah(pres, P, {
    judul: 'Cara login', sub: 'Login cukup dengan password akun Anda, tanpa username.',
    file: '01-login.png', crop: [400, 230, 640, 440],
    steps: [
      { n: 1, t: 'Buka dn.bi-nipponpaint.com', d: 'Gunakan Chrome atau Edge terbaru.' },
      { n: 2, t: 'Ketik password akun Anda', d: 'Klik ikon mata untuk mengecek ketikan.' },
      { n: 3, t: 'Klik Masuk', d: 'Admin langsung masuk ke Pencatatan Kehadiran.' },
    ],
    callouts: [{ n: 2, box: [561, 481, 318, 48] }, { n: 3, box: [562, 554, 316, 46] }],
    notes: 'Buka alamat dn.bi-nipponpaint.com. Halaman login hanya meminta password, karena setiap akun punya password unik. Klik ikon mata bila ingin memastikan ketikan benar, lalu klik Masuk. Akun Admin langsung diarahkan ke halaman Pencatatan Kehadiran. Jangan bagikan password ke orang lain.',
  });

  await langkah(pres, P, {
    judul: 'Mengenal tampilan utama', sub: 'Menu ada di sidebar kiri; judul dan keterangan halaman di bagian atas.',
    file: '03-sidebar-menu.png', crop: [0, 0, 1000, 620],
    steps: [
      { n: 1, t: 'Buka / tutup menu navigasi' },
      { n: 2, t: 'Menu Kehadiran & Target DN' },
      { n: 3, t: 'Judul & keterangan halaman' },
      { n: 4, t: 'Pilih Dealer Night (DN)' },
      { n: 5, t: 'Profil & Keluar: bawah sidebar' },
    ],
    callouts: [
      { n: 1, box: [237, 50, 36, 36] },
      { n: 2, box: [6, 78, 244, 345] },
      { n: 3, box: [270, 8, 410, 52], pos: 'right' },
      { n: 4, box: [510, 90, 488, 48] },
    ],
    tags: [{ text: 'Khusus Super Admin', at: [262, 480], w: 2.2 }],
    notes: 'Sidebar tertutup secara bawaan agar halaman memakai layar penuh. Klik tombol bulat di tepi sidebar (nomor 1) untuk membukanya. Menu dikelompokkan menjadi Kehadiran dan Target DN (nomor 2); grup Setting hanya terlihat oleh Super Admin. Judul halaman ada di atas (nomor 3). Hampir setiap halaman punya pemilih Dealer Night (nomor 4); bawaannya DN terdekat, jadi selalu cek DN sebelum bekerja. Profil dan tombol Keluar ada di bagian bawah sidebar (nomor 5).',
  });

  // ---------------- MODUL A: KEHADIRAN
  const A = 'Modul A · Kehadiran';
  pres.addSection({ title: A });
  await pembukaBagian(pres, A, {
    label: 'Modul A', judul: 'Kehadiran', ikonNama: 'LuClipboardCheck',
    desc: 'Mencatat tamu yang datang, memantau rekap, dan mengoreksi catatan.',
    halaman: ['Pencatatan Kehadiran', 'Dashboard Kehadiran', 'Detail Toko Hadir'],
    notes: 'Modul A membahas tiga halaman di grup Kehadiran: Pencatatan Kehadiran untuk mencatat tamu, Dashboard Kehadiran untuk melihat rekap, dan Detail Toko Hadir untuk melihat daftar serta mengoreksi catatan.',
  });

  {
    const s = konten(pres, A, 'Ringkasan modul Kehadiran', 'Dipakai paling sering di malam acara, di meja registrasi tamu.',
      'Fungsi modul ini adalah mencatat jumlah orang (pax) dan nomor undian setiap toko yang hadir. Yang mengisi adalah Admin DN di meja registrasi; role lain hanya memantau. Modul dipakai saat tamu tiba, lalu sesudah acara untuk mengecek dan mengoreksi data.');
    await kartuFitur(s, 0.6, 1.7, 3.85, 2.75, 'LuClipboardCheck', 'Fungsi', 'Mencatat pax dan nomor undian tiap toko yang hadir, lalu merekapnya.');
    await kartuFitur(s, 4.74, 1.7, 3.85, 2.75, 'LuUserCheck', 'Siapa', 'Admin DN mencatat; role lain hanya memantau.');
    await kartuFitur(s, 8.88, 1.7, 3.85, 2.75, 'LuCalendarClock' in lu ? 'LuCalendarClock' : 'LuClipboardList', 'Kapan', 'Saat tamu tiba di malam DN, dan sesudahnya untuk koreksi.');
    const hal = [['LuClipboardCheck', 'Pencatatan Kehadiran'], ['LuLayoutDashboard', 'Dashboard Kehadiran'], ['LuListChecks', 'Detail Toko Hadir']];
    for (let i = 0; i < hal.length; i++) {
      const x = 0.6 + i * 4.14;
      kartu(s, x, 4.8, 3.85, 1.0);
      await kotakIkon(s, hal[i][0], x + 0.25, 5.02, 0.56);
      teks(s, hal[i][1], { x: x + 1.0, y: 5.02, w: 2.75, h: 0.56, fontSize: 15, bold: true, valign: 'middle' });
    }
  }

  {
    const s = konten(pres, A, 'Alur modul Kehadiran', 'Satu toko dicatat sekali; koreksi dilakukan di Detail Toko Hadir.',
      'Alur utama: pilih DN, cari toko dengan nama atau MG Code, isi jumlah pax dan nomor undian, lalu simpan. Jika toko tidak ada di daftar, pakai Tambah manual. Jika toko sudah pernah dicatat, sistem meminta konfirmasi sebelum menimpa data lama. Setelah tersimpan, data langsung masuk ke dashboard dan Detail Toko Hadir, tempat Anda bisa mengoreksi atau mengunduh Excel.');
    const utama = [
      ['LuMapPin', 'Pilih DN'],
      ['LuSearch', 'Cari toko (nama / MG Code)'],
      ['LuPencil', 'Isi pax & nomor undian'],
      ['LuCheck', 'Simpan Kehadiran'],
      ['LuListChecks', 'Pantau & koreksi'],
    ];
    const w = 2.05; const gap = 0.47; const y = 1.75; const h = 1.65;
    const xs = utama.map((_, i) => 0.6 + i * (w + gap));
    for (let i = 0; i < utama.length; i++) {
      await node(s, xs[i], y, w, h, utama[i][0], utama[i][1]);
      if (i < utama.length - 1) panah(s, xs[i] + w + 0.05, y + h / 2, xs[i] + w + gap - 0.05, y + h / 2);
    }
    // Cabang: tidak ditemukan -> tambah manual; sudah tercatat -> konfirmasi
    const cab = [
      [1, 'Tidak ditemukan?', 'LuUserPlus', 'Tambah manual'],
      [3, 'Sudah tercatat?', 'LuTriangleAlert', 'Konfirmasi "Ya, ganti"'],
    ];
    for (const [i, tanya, ik, label] of cab) {
      const cx = xs[i] + w / 2;
      panah(s, cx, y + h + 0.05, cx, 4.55);
      pill(s, tanya, cx - 1.1, 3.7, 2.2, T.amberBg, T.amber);
      await node(s, xs[i], 4.6, w, 1.65, ik, label, { ikon: T.amber, latar: T.amberBg });
    }
  }

  await langkah(pres, A, {
    judul: 'Langkah 1–2: Buka halaman & pilih DN', sub: 'Halaman Pencatatan Kehadiran',
    file: '10-pencatatan-awal.png', crop: [0, 0, 1100, 460],
    steps: [
      { n: 1, t: 'Klik menu Pencatatan Kehadiran', d: 'Ikon papan centang di sidebar.' },
      { n: 2, t: 'Pastikan Dealer Night benar', d: 'Ganti DN lewat dropdown bila perlu.' },
    ],
    callouts: [{ n: 1, box: [6, 106, 36, 36] }, { n: 2, box: [406, 90, 676, 48] }],
    tip: 'Akun Admin otomatis membuka halaman ini setelah login.',
    notes: 'Buka menu Pencatatan Kehadiran. Akun Admin otomatis mendarat di halaman ini setelah login. Sebelum mencatat, pastikan Dealer Night di dropdown sudah sesuai acara malam itu. Mengganti DN akan mengosongkan pencarian.',
  });

  await langkah(pres, A, {
    judul: 'Langkah 3–4: Cari dan pilih toko', sub: 'Ketik minimal 2 huruf nama toko atau MG Code',
    file: '11-pencatatan-cari.png', crop: [380, 80, 730, 560],
    steps: [
      { n: 3, t: 'Ketik nama toko atau MG Code', d: 'Hasil muncul otomatis di bawahnya.' },
      { n: 4, t: 'Klik toko yang sesuai', d: 'Label "Sudah dicatat" = toko sudah hadir.' },
    ],
    callouts: [{ n: 3, box: [406, 150, 676, 52] }, { n: 4, box: [406, 212, 676, 72] }, { n: 4, box: [552, 436, 96, 24], pos: 'right' }],
    notes: 'Ketik nama toko atau MG Code di kolom cari; hasil muncul setelah dua karakter. MG Code paling tepat karena unik. Klik toko yang sesuai. Perhatikan label Sudah dicatat: artinya toko itu sudah tercatat hadir. Mencatatnya lagi akan menimpa data lama.',
  });

  await langkah(pres, A, {
    judul: 'Langkah 5–7: Isi pax & nomor undian, lalu simpan', sub: 'Cek dulu data toko di kartu bagian atas',
    file: '12-pencatatan-form.png', crop: [380, 80, 730, 500],
    steps: [
      { n: 5, t: 'Atur jumlah pax hadir', d: 'Tombol − / + atau ketik angkanya.' },
      { n: 6, t: 'Ketik nomor undian', d: 'Angka saja, sesuai kupon fisik.' },
      { n: 7, t: 'Klik Simpan Kehadiran' },
    ],
    callouts: [{ n: 5, box: [423, 419, 315, 52] }, { n: 6, box: [750, 419, 315, 52] }, { n: 7, box: [507, 501, 199, 50] }],
    notes: 'Setelah toko dipilih, kartu di atas menampilkan wilayah, region, dan depot; cek kembali bahwa tokonya benar. Atur jumlah pax hadir, ketik nomor undian sesuai kupon fisik (hanya angka), lalu klik Simpan Kehadiran. Notifikasi hijau muncul di bagian atas bila berhasil. Klik Batal untuk kembali ke pencarian tanpa menyimpan.',
  });

  await langkah(pres, A, {
    judul: 'Jika toko tidak ditemukan: Tambah manual', sub: 'Untuk tamu yang tidak ada di daftar undangan',
    file: '13-pencatatan-manual.png', crop: [440, 140, 560, 620],
    steps: [
      { n: 1, t: 'Klik "Tidak ditemukan? Tambah manual"', d: 'Link di bawah kolom cari.' },
      { n: 2, t: 'Isi nama, depot, pax, nomor undian' },
      { n: 3, t: 'Klik Simpan Kehadiran' },
    ],
    callouts: [{ n: 2, box: [482, 256, 476, 324] }, { n: 3, box: [574, 675, 383, 46], pos: 'topright' }],
    notes: 'Gunakan Tambah manual hanya untuk tamu yang benar-benar tidak ada di master. Cari dulu dengan MG Code sebelum memakai fitur ini. Isi nama customer, pilih depot, jumlah pax, dan nomor undian, lalu simpan. Wilayah dan region mengikuti depot yang dipilih. Catatan manual ditandai label Manual di Detail Toko Hadir.',
  });

  await langkah(pres, A, {
    judul: 'Memantau rekap di Dashboard Kehadiran', sub: 'Diperbarui otomatis tiap 10 detik',
    file: '14-dashboard.png', crop: [96, 88, 1296, 724],
    steps: [
      { n: 1, t: 'Pilih DN, Region, atau Depot' },
      { n: 2, t: 'Baca 4 angka utama', d: 'Toko diundang, toko hadir, target pax, pax hadir.' },
      { n: 3, t: 'Bandingkan per depot & persentase' },
    ],
    callouts: [{ n: 1, box: [117, 105, 492, 52] }, { n: 2, box: [100, 190, 1288, 190] }, { n: 3, box: [100, 396, 1288, 414] }],
    notes: 'Dashboard Kehadiran merangkum kehadiran. Pilih DN, lalu saring per Region atau Depot bila perlu. Empat kartu atas menunjukkan toko diundang, toko hadir, target pax, dan pax hadir. Grafik Sebaran per Depot membandingkan kehadiran tiap depot, dan diagram di kanan menunjukkan persentase toko serta pax yang sudah hadir.',
  });

  await langkah(pres, A, {
    judul: 'Menyaring dashboard per depot', sub: 'Filter bisa memilih lebih dari satu depot',
    file: '15-dashboard-filter-depot.png', crop: [100, 90, 970, 300],
    steps: [
      { n: 1, t: 'Klik dropdown Depot' },
      { n: 2, t: 'Centang satu atau beberapa depot', d: 'Angka dan grafik langsung menyesuaikan.' },
    ],
    callouts: [{ n: 1, box: [443, 107, 164, 48] }, { n: 2, box: [446, 210, 238, 76] }],
    tip: 'Kosongkan pilihan di dropdown yang sama untuk kembali ke semua depot.',
    notes: 'Klik dropdown Depot, lalu pilih satu atau beberapa depot. Anda juga bisa mengetik di kolom cari dropdown. Semua angka dan grafik langsung menyesuaikan. Untuk kembali ke semua depot, kosongkan pilihan di dropdown yang sama.',
  });

  await langkah(pres, A, {
    judul: 'Melihat daftar di Detail Toko Hadir', sub: 'Semua toko yang sudah tercatat hadir',
    file: '16-detail-hadir-list.png', crop: [150, 80, 1190, 720],
    steps: [
      { n: 1, t: 'Cari atau saring daftar', d: 'Nama / MG Code, Region, Depot.' },
      { n: 2, t: 'Klik "Waktu" untuk membalik urutan' },
      { n: 3, t: 'Download Excel sesuai filter' },
    ],
    callouts: [{ n: 1, box: [183, 175, 1122, 48] }, { n: 2, box: [1052, 278, 72, 30], pos: 'right' }, { n: 3, box: [1173, 90, 149, 48] }],
    notes: 'Halaman Detail Toko Hadir berisi semua catatan kehadiran. Cari dengan nama atau MG Code, atau saring per Region dan Depot. Klik judul kolom Waktu untuk mengurutkan dari yang paling baru atau paling awal datang. Tombol Download Excel mengunduh data sesuai filter yang sedang aktif.',
  });

  await langkah(pres, A, {
    judul: 'Melihat detail & memilih koreksi', sub: 'Klik baris toko untuk membuka detailnya',
    file: '17-detail-hadir-dialog.png', crop: [440, 120, 560, 660],
    steps: [
      { n: 1, t: 'Klik baris toko di tabel' },
      { n: 2, t: 'Klik Edit Data untuk mengoreksi' },
      { n: 3, t: 'Hapus hanya bila catatan salah total', d: 'Sistem meminta konfirmasi dulu.' },
    ],
    callouts: [{ n: 2, box: [588, 704, 369, 46], pos: 'top' }, { n: 3, box: [482, 703, 101, 48] }],
    notes: 'Klik baris mana pun untuk membuka detail: wilayah, region, depot, jumlah hadir, nomor undian, jam, dan tanggal check-in. Untuk mengoreksi pax atau nomor undian, klik Edit Data. Tombol Hapus menghapus catatan kehadiran; pakai hanya jika toko sebenarnya tidak hadir, karena tindakan ini tidak bisa dibatalkan. Ikon pensil dan tempat sampah di kolom Aksi tabel punya fungsi yang sama.',
  });

  await langkah(pres, A, {
    judul: 'Mengubah catatan kehadiran', sub: 'Depot toko terdaftar mengikuti master, tidak bisa diubah di sini',
    file: '18-detail-hadir-ubah.png', crop: [440, 170, 560, 560],
    steps: [
      { n: 1, t: 'Perbaiki jumlah pax hadir' },
      { n: 2, t: 'Perbaiki nomor undian' },
      { n: 3, t: 'Klik Simpan Perubahan', d: 'Atau Batal untuk keluar tanpa menyimpan.' },
    ],
    callouts: [{ n: 1, box: [482, 486, 476, 52] }, { n: 2, box: [482, 572, 476, 52] }, { n: 3, box: [574, 658, 383, 46], pos: 'topright' }],
    notes: 'Di dialog Ubah Catatan Kehadiran, perbaiki jumlah pax atau nomor undian, lalu klik Simpan Perubahan. Depot untuk toko terdaftar mengikuti master customer, jadi tidak bisa diubah di sini. Klik Batal atau tanda silang untuk keluar tanpa menyimpan.',
  });

  await slideTips(pres, A, {
    judul: 'Tips & kesalahan umum: Kehadiran', sub: 'Kebiasaan kecil yang mencegah data ganda dan salah nomor undian.',
    tips: [
      'Cari pakai MG Code agar hasilnya langsung tepat.',
      'Cek label "Sudah dicatat" sebelum mencatat.',
      'Nomor undian hanya angka, sesuai kupon fisik.',
    ],
    hindari: [
      'Mencatat ulang toko yang hadir: data lama tertimpa.',
      'Tambah manual untuk toko yang ada di master.',
    ],
    notes: 'Beberapa kebiasaan yang membuat pencatatan cepat dan akurat: cari dengan MG Code, cek label Sudah dicatat, dan tulis nomor undian persis seperti kupon fisik. Hindari mencatat ulang toko yang sudah hadir karena data lama akan tertimpa, dan jangan memakai Tambah manual untuk toko yang sebenarnya ada di master.',
  });

  // ---------------- MODUL B: DETAIL TARGET DN
  const Bg = 'Modul B · Detail Target DN';
  pres.addSection({ title: Bg });
  await pembukaBagian(pres, Bg, {
    label: 'Modul B', judul: 'Detail Target DN', ikonNama: 'LuClipboardList',
    desc: 'Memverifikasi Target Pusat tiap toko dan mencatat penyesuaian target.',
    halaman: ['Verifikasi', 'Penyesuaian', 'Master toko'],
    notes: 'Modul B membahas halaman Detail Target DN: membaca ringkasan target, memverifikasi Target Pusat setiap toko, mencatat penyesuaian bila target berubah, dan mengelola master toko.',
  });

  {
    const s = konten(pres, Bg, 'Ringkasan modul Detail Target DN', 'Setiap toko melewati tiga tahap target; semuanya tercatat di riwayat.',
      'Fungsi halaman ini adalah memastikan target setiap toko sesuai kesepakatan malam itu. Admin DN memverifikasi Target Pusat, lalu mencatat penyesuaian bila target berubah lagi. Role lain hanya melihat. Setiap toko melewati tiga tahap: Target Pusat dari tim pusat, Verifikasi oleh Admin DN, dan Target Saat Ini setelah penyesuaian. Target terbaru inilah yang dipakai leaderboard dan perhitungan kupon.');
    await kartuFitur(s, 0.6, 1.7, 3.85, 2.75, 'LuBadgeCheck', 'Fungsi', 'Memverifikasi Target Pusat tiap toko dan mencatat penyesuaiannya.');
    await kartuFitur(s, 4.74, 1.7, 3.85, 2.75, 'LuUserCheck', 'Siapa', 'Admin DN verifikasi & sesuaikan; role lain hanya melihat.');
    await kartuFitur(s, 8.88, 1.7, 3.85, 2.75, 'LuCalendarClock', 'Kapan', 'Saat toko mengisi formulir target, dan setiap kali target berubah.');
    const tahap = ['Target Pusat', 'Verifikasi Admin DN', 'Target Saat Ini'];
    for (let i = 0; i < tahap.length; i++) {
      const x = 0.6 + i * 4.14;
      kartu(s, x, 4.8, 3.85, 1.0);
      bulatan(s, i + 1, x + 0.3, 5.09);
      teks(s, tahap[i], { x: x + 0.95, y: 5.02, w: 2.8, h: 0.56, fontSize: 15, bold: true, valign: 'middle' });
      if (i < tahap.length - 1) panah(s, x + 3.88, 5.3, x + 4.11, 5.3);
    }
  }

  {
    const s = konten(pres, Bg, 'Alur modul Detail Target DN', 'Verifikasi sekali per toko; perubahan berikutnya dicatat sebagai penyesuaian.',
      'Pilih DN, buka tab Belum Verifikasi, lalu klik toko. Isi Target DN terverifikasi sesuai formulir, kemudian simpan. Sistem memberi No. Formulir yang wajib ditulis di formulir fisik. Bila target toko berubah lagi, buka toko dari tab Terverifikasi dan simpan penyesuaian; No. Formulir baru juga diberikan. Kupon dan leaderboard otomatis mengikuti target terbaru.');
    const utama = [
      ['LuMapPin', 'Pilih DN'],
      ['LuListChecks', 'Tab Belum Verifikasi'],
      ['LuMousePointerClick', 'Klik toko'],
      ['LuBadgeCheck', 'Isi target terverifikasi'],
      ['LuClipboardList', 'Simpan & tulis No. Formulir'],
    ];
    const w = 2.05; const gap = 0.47; const y = 1.75; const h = 1.65;
    const xs = utama.map((_, i) => 0.6 + i * (w + gap));
    for (let i = 0; i < utama.length; i++) {
      await node(s, xs[i], y, w, h, utama[i][0], utama[i][1]);
      if (i < utama.length - 1) panah(s, xs[i] + w + 0.05, y + h / 2, xs[i] + w + gap - 0.05, y + h / 2);
    }
    const cx = xs[4] + w / 2;
    panah(s, cx, y + h + 0.05, cx, 4.55);
    pill(s, 'Target berubah lagi?', cx - 1.2, 3.7, 2.4, T.amberBg, T.amber);
    await node(s, xs[4], 4.6, w, 1.65, 'LuSlidersHorizontal', 'Simpan penyesuaian', { ikon: T.amber, latar: T.amberBg });
    await node(s, xs[2], 4.6, w + gap + w, 1.65, 'LuTicket', 'Kupon & leaderboard ikut target terbaru', { ikon: T.violet, latar: T.violetBg });
    panah(s, xs[4] - 0.05, 4.6 + 1.65 / 2, xs[3] + w + 0.05, 4.6 + 1.65 / 2);
  }

  await langkah(pres, Bg, {
    judul: 'Mengenal halaman Detail Target DN', sub: 'Ringkasan, filter, dan status verifikasi dalam satu halaman',
    file: '20-target-list.png', crop: [96, 85, 1296, 375],
    steps: [
      { n: 1, t: 'Empat kartu KPI target', d: 'Total, pencapaian, persentase, penambahan.' },
      { n: 2, t: 'Cari & saring toko' },
      { n: 3, t: 'Tab status verifikasi', d: 'Angka di tab = jumlah toko.' },
    ],
    callouts: [{ n: 1, box: [100, 152, 1288, 134] }, { n: 2, box: [100, 298, 1288, 86] }, { n: 3, box: [104, 400, 433, 54] }],
    tip: 'KPI pencapaian dan penambahan ikut berubah saat Anda menyaring depot.',
    notes: 'Bagian atas halaman berisi empat kartu: Total Target DN untuk seluruh Dealer Night, Pencapaian Malam DN yaitu jumlah target toko yang sudah terverifikasi, Persentase Pencapaian terhadap total target, dan Total Penambahan setelah verifikasi. Di bawahnya ada kolom cari dan filter, lalu tab Semua, Belum Verifikasi, dan Terverifikasi. Tombol Download CSV, Upload Master, dan Tambah Master Data ada di kanan atas.',
  });

  await langkah(pres, Bg, {
    judul: 'Membaca tabel target', sub: 'Klik baris mana pun untuk membuka detail toko',
    file: '20-target-list.png', crop: [560, 400, 840, 500],
    steps: [
      { n: 1, t: 'Status kehadiran toko' },
      { n: 2, t: 'Target DN saat ini', d: 'Arahkan kursor untuk angka lengkap.' },
      { n: 3, t: 'Penambahan & jumlah penyesuaian' },
    ],
    callouts: [
      { n: 1, box: [612, 476, 114, 420], pos: 'top' },
      { n: 2, box: [836, 476, 96, 420], pos: 'top' },
      { n: 3, box: [968, 476, 260, 420], pos: 'top' },
    ],
    notes: 'Kolom Kehadiran menunjukkan apakah toko sudah tercatat hadir. Target DN menampilkan target saat ini dalam format ringkas; arahkan kursor untuk melihat angka lengkap. Toko yang belum diverifikasi ditandai Belum verifikasi. Kolom Penambahan menunjukkan selisih terhadap target terverifikasi, dan Total Penyesuaian menghitung berapa kali target diubah setelah verifikasi. Ikon pensil dan tempat sampah di kolom Aksi untuk mengelola master toko.',
  });

  await langkah(pres, Bg, {
    judul: 'Mencari & menyaring toko', sub: 'Filter bisa digabung: DN, Depot, Kehadiran, Penambahan',
    file: '22-target-filter-kehadiran.png', crop: [96, 292, 1296, 310],
    steps: [
      { n: 1, t: 'Cari toko, MG Code, salesman, atau SPV' },
      { n: 2, t: 'Saring Kehadiran atau Penambahan', d: 'Ada Penambahan = target berubah setelah verifikasi.' },
    ],
    callouts: [{ n: 1, box: [117, 315, 574, 52] }, { n: 2, box: [1034, 315, 340, 186] }],
    tip: 'Tombol Reset muncul saat ada filter aktif; klik untuk menghapus semua filter.',
    notes: 'Kolom cari menerima nama toko, MG Code, nama salesman, atau SPV. Filter Kehadiran memisahkan toko yang sudah dan belum hadir, sedangkan filter Penambahan memisahkan toko yang targetnya berubah setelah verifikasi. Semua filter bisa digabung. Tombol Reset hanya menghapus filter, tidak mengubah data.',
  });

  await langkah(pres, Bg, {
    judul: 'Verifikasi langkah 1–2: Pilih toko', sub: 'Mulai dari tab Belum Verifikasi',
    file: '23-target-tab-belum.png', crop: [96, 396, 1296, 410],
    steps: [
      { n: 1, t: 'Klik tab Belum Verifikasi' },
      { n: 2, t: 'Klik toko yang akan diverifikasi' },
    ],
    callouts: [{ n: 1, box: [104, 402, 433, 52] }, { n: 2, box: [100, 524, 1288, 70] }],
    tip: 'Toko berlabel "Belum verifikasi" belum dihitung di pencapaian dan kupon.',
    notes: 'Klik tab Belum Verifikasi untuk melihat toko yang targetnya belum dicek. Angka di tab menunjukkan jumlah toko. Klik baris toko yang formulirnya sedang Anda pegang untuk membuka dialog verifikasi.',
  });

  await langkah(pres, Bg, {
    judul: 'Verifikasi langkah 3–5: Isi & simpan', sub: 'Panel kanan: Verifikasi Target DN',
    file: '24-target-dialog-verifikasi.png', crop: [950, 270, 360, 420],
    steps: [
      { n: 3, t: 'Isi Target DN terverifikasi', d: 'Terisi Target Pusat; ubah bila beda.' },
      { n: 4, t: 'Cek Target pusat & Selisih' },
      { n: 5, t: 'Klik Simpan Verifikasi', d: 'Tulis No. Formulir di formulir fisik.' },
    ],
    callouts: [{ n: 3, box: [983, 353, 292, 50] }, { n: 4, box: [983, 438, 292, 86] }, { n: 5, box: [983, 537, 292, 117] }],
    notes: 'Di dialog toko, cek Target Pusat dan data toko di sebelah kiri. Di panel kanan, isi Target DN terverifikasi sesuai formulir; nilainya sudah terisi Target Pusat, jadi ubah hanya bila berbeda. Target minimal Rp50.000.000. Selisih terhadap Target Pusat langsung terlihat. Klik Simpan Verifikasi, lalu tulis No. Formulir yang tampil di formulir fisik.',
  });

  await langkah(pres, Bg, {
    judul: 'Mencatat penyesuaian target', sub: 'Untuk toko yang sudah terverifikasi lalu targetnya berubah',
    file: '26-target-isi-nominal.png', crop: [950, 245, 360, 435],
    steps: [
      { n: 1, t: 'Ketik Target DN baru', d: 'Buka toko dari tab Terverifikasi.' },
      { n: 2, t: 'Cek Selisih & Total penambahan' },
      { n: 3, t: 'Klik Simpan Penyesuaian', d: 'Tulis No. Formulir yang baru.' },
    ],
    callouts: [{ n: 1, box: [983, 328, 292, 50] }, { n: 2, box: [983, 413, 292, 129] }, { n: 3, box: [983, 553, 292, 117] }],
    notes: 'Bila target toko berubah setelah diverifikasi, buka toko dari tab Terverifikasi. Panel kanan berubah menjadi Penyesuaian Target DN. Ketik nominal target akhir yang baru, bukan selisihnya. Sistem menampilkan selisih terhadap target saat ini dan total penambahan sejak verifikasi. Klik Simpan Penyesuaian dan tulis No. Formulir baru di formulir fisik.',
  });

  await langkah(pres, Bg, {
    judul: 'Membaca perjalanan & riwayat target', sub: 'Semua perubahan tercatat: siapa, kapan, dan berapa',
    file: '25-target-dialog-penyesuaian.png', crop: [144, 172, 816, 556],
    steps: [
      { n: 1, t: 'Perjalanan target 3 tahap' },
      { n: 2, t: 'No. Formulir terakhir', d: 'Ikon pensil untuk memperbaikinya.' },
      { n: 3, t: 'Riwayat Target', d: 'Verifikasi & penyesuaian, terbaru di atas.' },
    ],
    callouts: [{ n: 1, box: [168, 283, 768, 107] }, { n: 2, box: [176, 441, 360, 44] }, { n: 3, box: [560, 431, 376, 256], pos: 'topright' }],
    notes: 'Bagian Perjalanan Target DN menunjukkan tiga tahap: Target Pusat, hasil Verifikasi Admin DN, dan Target Saat Ini beserta selisihnya. Baris No. Formulir menampilkan nomor formulir terakhir; ikon pensil dipakai bila nomor yang tercatat perlu diperbaiki. Riwayat Target mencatat setiap verifikasi dan penyesuaian, lengkap dengan nilai sebelum dan sesudah, nama pencatat, dan waktu.',
  });

  await langkah(pres, Bg, {
    judul: 'Menambah satu toko ke master', sub: 'Untuk toko undangan yang belum ada di master DN',
    file: '27-target-tambah-master.png', crop: [374, 82, 692, 736],
    steps: [
      { n: 1, t: 'Klik Tambah Master Data', d: 'Tombol biru di kanan atas.' },
      { n: 2, t: 'Isi DN, MG Code, nama, SOTP, depot' },
      { n: 3, t: 'Isi Target DN dari pusat', d: 'Lalu klik Tambah Toko.' },
    ],
    callouts: [{ n: 2, box: [402, 181, 636, 426] }, { n: 3, box: [402, 618, 636, 176] }],
    notes: 'Gunakan Tambah Master Data untuk menambah satu toko undangan yang belum ada di master. Isi Dealer Night, MG Code, MG Name, SOTP, dan depot; salesman dan SPV opsional. Isi Target DN dari pusat minimal Rp50.000.000, lalu klik Tambah Toko. Toko baru masuk sebagai Belum verifikasi.',
  });

  await langkah(pres, Bg, {
    judul: 'Menambah banyak toko: Upload Master', sub: 'File .csv atau .xlsx sesuai template Master Toko',
    file: '28-target-upload-master.png', crop: [444, 150, 552, 600],
    steps: [
      { n: 1, t: 'Klik Upload Master', d: 'Tombol di kanan atas halaman.' },
      { n: 2, t: 'Pilih DN & file', d: 'Klik "Unduh template" untuk formatnya.' },
      { n: 3, t: 'Klik Upload Master', d: 'Satu baris salah membatalkan semua.' },
    ],
    callouts: [{ n: 2, box: [482, 281, 476, 234] }, { n: 3, box: [546, 671, 411, 46], pos: 'topright' }],
    notes: 'Untuk banyak toko sekaligus, pakai Upload Master. Pilih Dealer Night tujuan, lalu pilih file CSV atau Excel maksimal 5 MB. Kolom wajib: MG Code, MG Name, SOTP Code, SOTP Name, Depot Code, Salesman, SPV, dan Target DN. Unduh template dari link di dialog. MG Code yang sudah ada akan diperbarui, dan satu baris yang salah membatalkan seluruh upload, jadi periksa file sebelum mengunggah.',
  });

  await slideTips(pres, Bg, {
    judul: 'Tips & kesalahan umum: Detail Target DN', sub: 'Target yang tercatat menentukan pencapaian, leaderboard, dan kupon.',
    tips: [
      'Tulis No. Formulir dari sistem di formulir fisik.',
      'Bila muncul peringatan nomor berubah, pakai nomor terbaru.',
      'Isi target akhir, bukan selisihnya.',
    ],
    hindari: [
      'Target di bawah Rp50.000.000: sistem menolak.',
      'Hapus toko / Reset Verifikasi: riwayatnya ikut terhapus.',
    ],
    notes: 'Setelah menyimpan, segera tulis No. Formulir di formulir fisik. Jika admin lain menyimpan lebih dulu, nomor bisa bergeser dan sistem menampilkan peringatan berisi nomor yang benar. Saat penyesuaian, ketik target akhir, bukan selisih. Hindari target di bawah Rp50 juta karena akan ditolak. Menghapus toko ikut menghapus riwayat penyesuaian dan catatan kehadirannya. Tombol Reset Verifikasi di dialog Edit Master mengembalikan toko ke Target Pusat dan menghapus verifikasi, penyesuaian, serta catatan kuponnya. Keduanya tidak bisa dibatalkan.',
  });

  // ---------------- MODUL C: DETAIL KUPON
  const C = 'Modul C · Detail Kupon';
  pres.addSection({ title: C });
  await pembukaBagian(pres, C, {
    label: 'Modul C', judul: 'Detail Kupon', ikonNama: 'LuTicket',
    desc: 'Menghitung hak kupon undian dan mencatat pembuatan serta pemberiannya.',
    halaman: ['Hak kupon', 'Pembuatan', 'Pemberian'],
    notes: 'Modul C membahas halaman Detail Kupon: membaca hak kupon setiap toko, mencatat kupon yang sudah dicetak, dan mencatat kupon yang sudah diserahkan ke toko, baik satu per satu maupun sekaligus.',
  });

  {
    const s = konten(pres, C, 'Ringkasan modul Detail Kupon', 'Hak kupon dihitung otomatis dari Target DN terverifikasi.',
      'Halaman ini menghitung hak kupon undian setiap toko dari Target DN saat ini, setelah target diverifikasi. Kupon pink diberikan satu untuk setiap Rp100 juta, dan kupon hijau satu untuk setiap Rp25 juta. Keduanya dihitung dari target penuh, jadi target Rp100 juta mendapat 1 pink dan 4 hijau. Admin DN mencatat pembuatan dan pemberian kupon; role lain hanya melihat.');
    await kartuFitur(s, 0.6, 1.7, 3.85, 2.75, 'LuTicket', 'Fungsi', 'Menghitung hak kupon dan mencatat pembuatan & pemberiannya.');
    await kartuFitur(s, 4.74, 1.7, 3.85, 2.75, 'LuUserCheck', 'Siapa', 'Admin DN mencatat; role lain hanya melihat.');
    await kartuFitur(s, 8.88, 1.7, 3.85, 2.75, 'LuCalendarClock', 'Kapan', 'Setelah target diverifikasi, saat kupon dicetak dan diserahkan.');
    const aturan = [
      [T.pink, 'Pink: 1 per Rp100 juta'],
      [T.emerald, 'Hijau: 1 per Rp25 juta'],
      [T.primary, 'Rp100 juta = 1 pink + 4 hijau'],
    ];
    for (let i = 0; i < aturan.length; i++) {
      const x = 0.6 + i * 4.14;
      kartu(s, x, 4.8, 3.85, 1.0);
      s.addShape('ellipse', { x: x + 0.35, y: 5.19, w: 0.22, h: 0.22, fill: { color: aturan[i][0] }, line: { color: aturan[i][0], width: 0 } });
      teks(s, aturan[i][1], { x: x + 0.8, y: 5.02, w: 2.95, h: 0.56, fontSize: 15, bold: true, valign: 'middle' });
    }
  }

  {
    const s = konten(pres, C, 'Alur status kupon', 'Setiap toko bergerak dari kiri ke kanan; tombol di tabel mengikuti statusnya.',
      'Toko yang targetnya belum diverifikasi berstatus Belum Verifikasi dan belum punya hak kupon. Setelah diverifikasi di Modul B, statusnya menjadi Perlu Dibuat. Setelah kupon dicetak dan dicatat pembuatannya, status menjadi Siap Diberikan. Setelah kupon diserahkan dan dicatat pemberiannya, status menjadi Selesai. Jika target naik setelah itu, sisa kupon otomatis kembali muncul sebagai Perlu Dibuat.');
    const st = [
      ['LuClock3' in lu ? 'LuClock3' : 'LuCalendarClock', 'Belum Verifikasi', T.amber, T.amberBg],
      ['LuPrinter', 'Perlu Dibuat', T.sky, T.skyBg],
      ['LuPackageCheck', 'Siap Diberikan', T.violet, T.violetBg],
      ['LuCheck', 'Selesai', T.green, T.greenBg],
    ];
    const aksi = ['Verifikasi target', 'Catat Pembuatan', 'Catat Pemberian'];
    const w = 2.1; const gap = 1.24; const y = 1.95; const h = 1.65;
    const xs = st.map((_, i) => 0.6 + i * (w + gap));
    for (let i = 0; i < st.length; i++) {
      await node(s, xs[i], y, w, h, st[i][0], st[i][1], { ikon: st[i][2], latar: st[i][3] });
      if (i < st.length - 1) {
        panah(s, xs[i] + w + 0.05, y + h / 2, xs[i] + w + gap - 0.05, y + h / 2, T.primary);
        teks(s, aksi[i], { x: xs[i] + w + 0.02, y: y + h / 2 - 0.62, w: gap - 0.04, h: 0.55, fontSize: 14, bold: true, color: T.primary, align: 'center', valign: 'bottom' });
      }
    }
    // Target naik setelah selesai -> sisa kembali Perlu Dibuat
    const cx = xs[3] + w / 2;
    panah(s, cx, y + h + 0.05, cx, 4.65);
    pill(s, 'Target naik?', cx - 0.9, 3.95, 1.8, T.amberBg, T.amber);
    kartu(s, xs[1], 4.7, xs[3] + w - xs[1], 1.1, { fill: T.skyBg, line: 'BAE6FD', flat: true });
    teks(s, 'Sisa kupon otomatis kembali ke Perlu Dibuat. Target turun tidak menarik kupon yang sudah dibuat.', {
      x: xs[1] + 0.3, y: 4.7, w: xs[3] + w - xs[1] - 0.6, h: 1.1, fontSize: 15, color: T.fg2, valign: 'middle',
    });
  }

  await langkah(pres, C, {
    judul: 'Mengenal halaman Detail Kupon', sub: 'Ringkasan per warna dan jumlah toko per status',
    file: '30-kupon-ringkasan.png', crop: [96, 85, 1296, 375],
    steps: [
      { n: 1, t: 'Kartu Kupon Pink & Hijau', d: 'Hak, dibuat, diberikan, sisa.' },
      { n: 2, t: 'Kartu status', d: 'Klik untuk menyaring tabel.' },
      { n: 3, t: 'Download CSV' },
    ],
    callouts: [{ n: 1, box: [100, 152, 1288, 204] }, { n: 2, box: [100, 369, 1288, 84] }, { n: 3, box: [1241, 88, 147, 52] }],
    tip: 'Klik kartu status yang sama sekali lagi untuk kembali ke semua status.',
    notes: 'Dua kartu atas merangkum kupon pink dan hijau: total hak, jumlah yang sudah dibuat dan diberikan, serta sisa yang perlu dibuat dan siap diberikan. Bilah warna menunjukkan progresnya. Empat kartu status di bawahnya menghitung toko per status dan bisa diklik untuk menyaring tabel. Download CSV mengunduh seluruh data kupon DN yang dipilih.',
  });

  await langkah(pres, C, {
    judul: 'Membaca tabel kupon', sub: 'Klik baris atau tombol aksi untuk membuka detail kupon toko',
    file: '30-kupon-ringkasan.png', crop: [560, 575, 840, 325],
    steps: [
      { n: 1, t: 'Hak kupon pink & hijau', d: 'Dari Target DN saat ini.' },
      { n: 2, t: 'Dibuat & diberikan', d: 'Format: jumlah / hak.' },
      { n: 3, t: 'Tombol aksi sesuai status', d: 'Buat, Berikan, atau Selesai.' },
    ],
    callouts: [{ n: 1, box: [776, 580, 166, 316] }, { n: 2, box: [1000, 580, 190, 316] }, { n: 3, box: [1236, 580, 104, 316] }],
    tip: 'Toko Belum Verifikasi menampilkan tanda strip (—) dan belum punya hak kupon.',
    notes: 'Kolom Hak Kupon menunjukkan jumlah kupon pink dan hijau yang menjadi hak toko. Kolom Dibuat dan Diberikan ditulis sebagai jumlah per hak, misalnya 4 per 4. Tombol di kolom Aksi mengikuti status: Buat bila masih ada kupon yang perlu dicetak, Berikan bila kupon siap diserahkan, dan Selesai bila semua sudah diberikan. Toko yang belum diverifikasi menampilkan tanda strip.',
  });

  await langkah(pres, C, {
    judul: 'Mencatat pembuatan & pemberian kupon', sub: 'Klik tombol Buat atau Berikan di baris toko',
    file: '33-kupon-dialog-berikan.png', crop: [848, 272, 385, 432],
    steps: [
      { n: 1, t: 'Pilih Catat Pembuatan atau Pemberian', d: 'Tab tanpa sisa kupon nonaktif.' },
      { n: 2, t: 'Atur jumlah kupon pink & hijau', d: 'Maksimal = sisa kupon.' },
      { n: 3, t: 'Klik Simpan Pembuatan / Pemberian' },
    ],
    callouts: [{ n: 1, box: [871, 291, 338, 46] }, { n: 2, box: [871, 378, 340, 169] }, { n: 3, box: [871, 608, 338, 46] }],
    notes: 'Klik tombol Buat atau Berikan di baris toko untuk membuka dialog kupon. Di panel kanan, pilih Catat Pembuatan saat kupon selesai dicetak, atau Catat Pemberian saat kupon diserahkan; tab yang tidak punya sisa kupon otomatis nonaktif. Jumlah pink dan hijau sudah terisi sisa kupon dan bisa dikurangi. Contoh di layar adalah Catat Pemberian; Catat Pembuatan memakai form yang sama dengan tombol Simpan Pembuatan. Jika toko belum tercatat hadir, muncul peringatan kuning sebagai pengingat.',
  });

  await langkah(pres, C, {
    judul: 'Membaca posisi & riwayat kupon', sub: 'Panel kiri dialog kupon',
    file: '33-kupon-dialog-berikan.png', crop: [208, 272, 640, 432],
    steps: [
      { n: 1, t: 'Posisi kupon per warna', d: 'Hak, dibuat, diberikan, perlu dibuat.' },
      { n: 2, t: 'Status kehadiran toko' },
      { n: 3, t: 'Riwayat & tombol Batalkan', d: 'Untuk membatalkan catatan yang salah.' },
    ],
    callouts: [{ n: 1, box: [232, 320, 592, 170] }, { n: 2, box: [232, 540, 592, 50] }, { n: 3, box: [232, 634, 592, 62] }],
    notes: 'Panel kiri menampilkan posisi kupon pink dan hijau: hak, jumlah dibuat, diberikan, dan yang masih perlu dibuat. Di bawahnya ada status kehadiran toko. Riwayat Proses Kupon mencatat setiap pembuatan dan pemberian beserta pencatat dan waktunya. Bila ada catatan yang salah, klik Batalkan pada baris tersebut, lalu catat ulang dengan jumlah yang benar.',
  });

  await langkah(pres, C, {
    judul: 'Memproses banyak toko sekaligus', sub: 'Aksi massal untuk toko yang statusnya sama',
    file: '34-kupon-aksi-massal.png', crop: [96, 570, 960, 330],
    steps: [
      { n: 1, t: 'Centang toko yang akan diproses', d: 'Kotak di header = pilih satu halaman.' },
      { n: 2, t: 'Klik Tandai Dibuat / Tandai Diberikan', d: 'Toko yang tidak sesuai dilewati.' },
    ],
    callouts: [{ n: 1, box: [114, 582, 40, 160] }, { n: 2, box: [703, 830, 298, 46], pos: 'top' }],
    tip: 'Aksi massal mencatat seluruh sisa kupon tiap toko terpilih sekaligus.',
    notes: 'Untuk memproses banyak toko sekaligus, centang toko di kolom paling kiri; kotak di header memilih semua toko di halaman itu. Bilah aksi muncul di bawah layar. Klik Tandai Dibuat untuk mencatat semua sisa kupon yang perlu dibuat, atau Tandai Diberikan untuk semua kupon yang siap diberikan. Toko yang statusnya tidak sesuai otomatis dilewati, dan jumlahnya disebutkan di notifikasi. Klik tanda silang untuk membatalkan pilihan.',
  });

  await slideTips(pres, C, {
    judul: 'Tips & kesalahan umum: Detail Kupon', sub: 'Catat sesuai kejadian nyata: dicetak, lalu diserahkan.',
    tips: [
      'Klik kartu status untuk melihat toko yang perlu ditindaklanjuti.',
      'Catat pembuatan setelah kupon benar-benar dicetak.',
      'Cek kehadiran toko sebelum memberikan kupon.',
    ],
    hindari: [
      'Salah jumlah? Batalkan di riwayat, jangan catat dobel.',
      'Menganggap target turun otomatis menarik kupon.',
    ],
    notes: 'Gunakan kartu status untuk fokus pada toko yang perlu ditindaklanjuti. Catat pembuatan hanya setelah kupon dicetak, dan pemberian hanya setelah kupon diserahkan; sebaiknya pastikan toko sudah tercatat hadir. Jika salah mencatat, batalkan catatannya di riwayat lalu catat ulang, jangan menambah catatan baru untuk mengoreksi. Jika target toko turun setelah kupon dibuat, kupon yang sudah dibuat tidak ditarik otomatis; selisihnya perlu ditangani manual.',
  });

  // ---------------- PENUTUP
  const Z = 'Penutup';
  pres.addSection({ title: Z });
  {
    const s = konten(pres, Z, 'FAQ', 'Pertanyaan yang paling sering muncul dari Admin DN.',
      'Empat pertanyaan yang paling sering muncul. Menu yang tidak tampil berarti izin halamannya belum diberikan. Password hanya bisa diganti Super Admin. Data diperbarui otomatis tiap 10 detik, jadi tunggu sebentar dan cek pilihan DN serta filter. Kupon baru bisa diproses setelah target toko diverifikasi.');
    const faq = [
      ['LuListChecks', 'Menu yang saya butuhkan tidak muncul?', 'Minta Super Admin menambahkan izin halaman di User Management.'],
      ['LuShieldCheck', 'Lupa password?', 'Hubungi Super Admin untuk membuat password baru.'],
      ['LuClock3' in lu ? 'LuClock3' : 'LuCalendarClock', 'Data di layar belum berubah?', 'Tunggu hingga 10 detik; cek DN dan filter yang dipilih.'],
      ['LuTicket', 'Kupon toko tidak bisa diproses?', 'Pastikan target toko sudah diverifikasi di Detail Target DN.'],
    ];
    for (let i = 0; i < faq.length; i++) {
      const x = 0.6 + (i % 2) * 6.22; const y = 1.7 + Math.floor(i / 2) * 2.45;
      kartu(s, x, y, 5.91, 2.2);
      await kotakIkon(s, faq[i][0], x + 0.3, y + 0.3, 0.6);
      teks(s, faq[i][1], { x: x + 1.15, y: y + 0.3, w: 4.5, h: 0.6, fontFace: H, fontSize: 18, bold: true, valign: 'middle' });
      teks(s, faq[i][2], { x: x + 1.15, y: y + 1.0, w: 4.5, h: 0.95, fontSize: 15, color: T.fg2 });
    }
  }

  {
    const s = konten(pres, Z, 'Troubleshooting', 'Cari gejalanya di kolom kiri, lalu ikuti solusinya.',
      'Tabel ini merangkum masalah yang paling sering terjadi. Notifikasi merah biasanya disebabkan koneksi atau isian yang tidak valid. Toko yang tidak ditemukan sering karena DN yang dipilih salah. Nomor formulir bisa bergeser bila admin lain menyimpan lebih dulu; gunakan nomor di notifikasi. Upload master gagal bila ada satu baris yang tidak sesuai template.');
    const head = (t) => ({ text: t, options: { bold: true, color: T.fg, fill: { color: T.secondary }, fontFace: H } });
    const sel = (t, o = {}) => ({ text: t, options: { color: T.fg2, ...o } });
    const rows = [
      [head('Gejala'), head('Penyebab umum'), head('Solusi')],
      [sel('Notifikasi merah "Gagal..."', { bold: true, color: T.fg }), sel('Koneksi putus / isian tidak valid'), sel('Cek internet & isian, lalu simpan ulang')],
      [sel('Toko tidak ditemukan', { bold: true, color: T.fg }), sel('DN salah / salah ketik'), sel('Cek DN, cari pakai MG Code')],
      [sel('No. Formulir bergeser', { bold: true, color: T.fg }), sel('Admin lain menyimpan lebih dulu'), sel('Pakai nomor di notifikasi terbaru')],
      [sel('Upload Master gagal', { bold: true, color: T.fg }), sel('Ada baris tak sesuai template'), sel('Perbaiki baris itu, upload ulang')],
    ];
    kartu(s, 0.6, 1.7, 12.13, 4.2);
    s.addTable(rows, {
      x: 0.75, y: 1.85, w: 11.83, colW: [3.6, 3.95, 4.28], rowH: 0.76,
      fontFace: B, fontSize: 15, valign: 'middle', margin: [0, 0.18, 0, 0.18],
      border: { type: 'solid', color: T.border, pt: 0.75 },
    });
    await kotakIkon(s, 'LuHeadset', 0.6, 6.12, 0.56);
    teks(s, 'Masalah belum selesai? Hubungi kontak dukungan di slide berikutnya.', { x: 1.35, y: 6.2, w: 11, h: 0.4, fontSize: 15, color: T.fg2 });
  }

  {
    const s = pres.addSlide({ masterName: 'SECTION', sectionTitle: Z });
    teks(s, 'PENUTUP', { x: 0.8, y: 2.2, w: 6, h: 0.4, fontFace: H, fontSize: 16, bold: true, color: 'C7D2FE', charSpacing: 2 });
    s.addText('Terima kasih', { placeholder: 'title' });
    s.addText('Butuh bantuan memakai DN Administration System? Hubungi kontak dukungan.', { placeholder: 'body' });
    kartu(s, 8.4, 2.0, 4.3, 3.3, { line: 'FFFFFF' });
    await kotakIkon(s, 'LuHeadset', 8.8, 2.4, 0.7);
    teks(s, 'Kontak dukungan', { x: 8.8, y: 3.3, w: 3.6, h: 0.45, fontFace: H, fontSize: 20, bold: true });
    teks(s, KONTAK, { x: 8.8, y: 3.8, w: 3.6, h: 0.45, fontSize: 16, color: T.fg2 });
    teks(s, 'dn.bi-nipponpaint.com', { x: 8.8, y: 4.5, w: 3.6, h: 0.4, fontSize: 15, color: T.primary, bold: true });
    pill(s, VERSI, 0.8, 5.05, 3.3, '5A70FF', 'FFFFFF');
    footer(s, Z, true);
    s.addNotes('Terima kasih. Jika ada kendala yang tidak tercakup di panduan ini, hubungi kontak dukungan yang tertera. Panduan ini akan diperbarui bila ada perubahan tampilan atau fitur; cek nomor versi di cover.');
  }

  await pres.writeFile({ fileName: OUT });
  const skill = process.env.PPTX_SKILL;
  if (skill) {
    const { applyTheme } = require(path.join(skill, 'scripts/apply_theme.js'));
    await applyTheme(OUT, THEME);
  }
  console.log('tersimpan:', OUT);
}

build().catch((e) => { console.error(e); process.exit(1); });
