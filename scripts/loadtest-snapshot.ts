import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { db, PREFIX_SAP, TANDA } from './loadtest-common';

/**
 * Bukti bahwa uji beban tidak meninggalkan jejak.
 *
 *   npm run loadtest:snapshot             -> simpan keadaan awal
 *   npm run loadtest:snapshot -- --banding -> bandingkan dengan keadaan awal
 *
 * Dijalankan sebelum seed dan sesudah reset. Yang diperiksa bukan cuma "data
 * dummy sudah hilang", tapi juga "baris yang bukan dummy masih persis sama" -
 * karena yang paling berbahaya dari uji beban di database berisi data nyata
 * bukan sisa yang tertinggal, melainkan baris asli yang ikut berubah.
 *
 * Tabelnya kecil (ratusan baris), jadi menyimpan seluruh isinya murah.
 */
const TABEL = ['customers', 'profiles', 'reservations', 'order_adjustments', 'app_settings'] as const;
type Tabel = (typeof TABEL)[number];
type Baris = Record<string, unknown>;
type Isi = Record<Tabel, Baris[]>;

const DIR = 'load-tests/data';

/** Baris buatan uji beban, dikenali dari penandanya - sama seperti loadtest-reset. */
function dummy(tabel: Tabel, b: Baris) {
  if (tabel === 'customers') return String(b.kode_sap ?? '').startsWith(PREFIX_SAP);
  if (tabel === 'profiles') return String(b.full_name ?? '').startsWith(TANDA);
  // reservations & order_adjustments tidak punya penanda sendiri; keduanya ikut
  // terhapus lewat cascade saat toko dummy dibuang, jadi yang tersisa memang
  // harus cocok dengan snapshot awal.
  return false;
}

/** Kunci stabil untuk membandingkan baris tanpa bergantung urutan query. */
const kunci = (b: Baris) => JSON.stringify(b, Object.keys(b).sort());

async function baca(sql: ReturnType<typeof db>): Promise<Isi> {
  const isi = {} as Isi;
  for (const t of TABEL) {
    isi[t] = (await sql`select * from public.${sql(t)}`) as unknown as Baris[];
  }
  return isi;
}

function snapshotTerakhir(): { nama: string; isi: Isi } {
  const berkas = readdirSync(DIR)
    .filter((f) => f.startsWith('snapshot-') && f.endsWith('.json'))
    .sort();
  const nama = berkas.at(-1);
  if (!nama) throw new Error(`Tidak ada snapshot di ${DIR}. Jalankan tanpa --banding dulu.`);
  return { nama, isi: JSON.parse(readFileSync(`${DIR}/${nama}`, 'utf8')) as Isi };
}

async function main() {
  const banding = process.argv.includes('--banding');
  const sql = db(1);
  try {
    const sekarang = await baca(sql);

    if (!banding) {
      const nama = `snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      writeFileSync(`${DIR}/${nama}`, JSON.stringify(sekarang, null, 2));
      console.log(`Snapshot disimpan: ${DIR}/${nama}`);
      for (const t of TABEL) {
        const n = sekarang[t].length;
        const d = sekarang[t].filter((b) => dummy(t, b)).length;
        console.log(`  ${t.padEnd(18)} ${String(n).padStart(6)} baris${d ? `  (${d} DUMMY sudah ada!)` : ''}`);
      }
      return;
    }

    const { nama, isi: awal } = snapshotTerakhir();
    console.log(`Dibandingkan dengan: ${nama}\n`);
    let lulus = true;

    for (const t of TABEL) {
      const sisaDummy = sekarang[t].filter((b) => dummy(t, b));
      // Yang dibandingkan adalah baris NON-dummy: dummy di snapshot awal (kalau
      // ada) memang tidak diharapkan kembali.
      const dulu = new Set(awal[t].filter((b) => !dummy(t, b)).map(kunci));
      const kini = new Set(sekarang[t].filter((b) => !dummy(t, b)).map(kunci));
      const hilang = [...dulu].filter((k) => !kini.has(k));
      const baru = [...kini].filter((k) => !dulu.has(k));

      const masalah = sisaDummy.length > 0 || hilang.length > 0 || baru.length > 0;
      if (masalah) lulus = false;
      console.log(`  [${masalah ? 'GAGAL' : 'LULUS'}] ${t}`);
      if (sisaDummy.length) console.log(`          ${sisaDummy.length} baris dummy MASIH ADA`);
      if (hilang.length) console.log(`          ${hilang.length} baris asli HILANG`);
      if (baru.length) console.log(`          ${baru.length} baris asing BERTAMBAH`);
      for (const k of [...hilang, ...baru].slice(0, 3)) console.log(`          ${k.slice(0, 160)}`);
    }

    console.log(`\n  HASIL: ${lulus ? 'BERSIH - database kembali seperti sebelum uji beban' : 'BELUM BERSIH'}`);
    process.exitCode = lulus ? 0 : 1;
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
