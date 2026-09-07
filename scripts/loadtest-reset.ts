import { db, PREFIX_SAP, TANDA } from './loadtest-common';

/**
 * Membersihkan seluruh data uji beban dari database staging.
 *
 * Menghapus toko dummy akan ikut membuang ledger dan kehadirannya lewat cascade,
 * jadi tidak ada sisa yang mengotori pengukuran berikutnya.
 */
async function main() {
  const sql = db(1);
  try {
    const toko = await sql`
      delete from public.customers where kode_sap like ${PREFIX_SAP + '%'} returning id`;
    const staff = await sql`
      delete from public.profiles where full_name like ${TANDA + '%'} returning id`;
    // Sisa order/kehadiran milik toko non-dummy (kalau ada) sengaja TIDAK disentuh.
    const [sisa] = await sql<{ orders: number; kehadiran: number }[]>`
      select (select count(*)::int from public.order_adjustments) as orders,
             (select count(*)::int from public.reservations) as kehadiran`;
    console.log(`  ${toko.length} toko dummy + ${staff.length} staff dummy dihapus.`);
    console.log(`  sisa di staging: ${sisa.orders} baris ledger, ${sisa.kehadiran} kehadiran.`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
