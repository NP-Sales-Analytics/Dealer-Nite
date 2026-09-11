import { readFileSync } from 'node:fs';
import path from 'node:path';

export type IndukDepot = { region: string; wilayah: string };
export type PilihanDepot = IndukDepot & { depot: string };

/**
 * Hierarki resmi Wilayah > Region > Depot, dibaca dari
 * public/Hierarchy Depot.csv (termasuk depot sintetis Komunitas & Media).
 *
 * Dibaca dari berkas, bukan ditulis ulang sebagai konstanta TypeScript, supaya
 * daftar depot bisa diperbarui tanpa menyentuh kode. Konsekuensinya berkas itu
 * harus ikut terbawa saat deploy - lihat outputFileTracingIncludes di
 * next.config.ts, karena Next tidak bisa menebak path yang dirakit saat runtime.
 *
 * Dibaca sekali per proses: isinya beberapa kilobyte dan praktis tidak berubah.
 */
let tersimpan: Map<string, IndukDepot> | null = null;

function muat(): Map<string, IndukDepot> {
  const berkas = path.join(process.cwd(), 'public', 'Hierarchy Depot.csv');
  const peta = new Map<string, IndukDepot>();

  let isi: string;
  try {
    isi = readFileSync(berkas, 'utf8');
  } catch {
    // Hierarki hanya memperkaya pemetaan yang sudah ada; kalau berkasnya hilang
    // saat deploy, dropdown tetap jalan memakai nilai dari basis data.
    return peta;
  }

  // Pemisah koma polos sudah cukup: berkas ini tidak punya bidang berkutip, dan
  // tidak ada nama depot/region yang mengandung koma. ﻿ membuang BOM Excel.
  const baris = isi.replace(/^﻿/, '').split(/\r?\n/).slice(1);
  for (const b of baris) {
    if (!b.trim()) continue;
    const [wilayah, region, , depot] = b.split(',').map((v) => v.trim());
    if (!depot || !region) continue;
    peta.set(depot, { region, wilayah: wilayah || '' });
  }
  return peta;
}

export function hierarkiDepot(): Map<string, IndukDepot> {
  tersimpan ??= muat();
  return tersimpan;
}

/**
 * Melengkapi region/wilayah sebuah depot dari hierarki.
 *
 * Nilai dari basis data MENANG bila ada. Alasannya: penyaringan di SQL berjalan
 * atas customers.region, dan empat depot punya region yang berbeda dari hierarki
 * ('4A Medan' tersimpan '5', hierarki bilang '5A'). Kalau hierarki dipaksa
 * menang, memilih "Region 5" di dropdown tidak akan lagi memunculkan Medan.
 * Hierarki dipakai untuk mengisi yang KOSONG - terutama depot yang cuma punya
 * baris manual entry, yang sebelumnya nyangkut muncul di semua region.
 */
export function lengkapiInduk(
  depot: string,
  region: string | null,
  wilayah: string | null,
): { region: string | null; wilayah: string | null } {
  if (region && wilayah) return { region, wilayah };
  const induk = hierarkiDepot().get(depot);
  return {
    region: region ?? induk?.region ?? null,
    wilayah: wilayah ?? induk?.wilayah ?? null,
  };
}

/**
 * Seluruh nama depot resmi, urut abjad.
 *
 * Dipakai sebagai isi dropdown Tamu Manual. Sebelumnya daftar itu diturunkan
 * dari depot yang kebetulan sudah ada di tabel customers, sehingga depot yang
 * belum punya satu pun toko tidak bisa dipilih sama sekali - padahal tamu
 * manual justru sering datang dari depot semacam itu.
 */
export function semuaDepot(): string[] {
  return [...hierarkiDepot().keys()].sort((a, b) => a.localeCompare(b, 'id'));
}

/** Daftar lengkap untuk dropdown depot yang sekaligus mengisi region/wilayah. */
export function pilihanDepot(): PilihanDepot[] {
  return [...hierarkiDepot().entries()]
    .map(([depot, induk]) => ({ depot, ...induk }))
    .sort((a, b) => a.depot.localeCompare(b.depot, 'id'));
}
