import { bacaActiveRun, bacaSeededTarget, db, tulisActiveRun } from './loadtest-common';

type ExistingCustomer = { id: string; kode_sap: string };
type ExistingStaff = { id: string; full_name: string };

async function main() {
  const active = bacaActiveRun();
  const target = bacaSeededTarget();
  const customerIds = target.customers.map((row) => row.id);
  const staffIds = target.staff.map((row) => row.id);
  const sql = db(1, target.runId);

  try {
    const existingCustomers = await sql<ExistingCustomer[]>`
      select id, kode_sap from public.customers where id in ${sql(customerIds)}`;
    const existingStaff = await sql<ExistingStaff[]>`
      select id, full_name from public.profiles where id in ${sql(staffIds)}`;

    for (const row of existingCustomers) {
      const expected = target.customers.find((item) => item.id === row.id);
      if (!expected || row.kode_sap !== expected.kodeSap || !row.kode_sap.startsWith(`${target.runId}_C_`)) {
        throw new Error(`DITOLAK: customer ${row.id} tidak cocok dengan marker manifest.`);
      }
    }
    for (const row of existingStaff) {
      const expected = target.staff.find((item) => item.id === row.id);
      if (!expected || row.full_name !== expected.fullName || !row.full_name.startsWith(`${target.runId} STAFF `)) {
        throw new Error(`DITOLAK: staff ${row.id} tidak cocok dengan marker manifest.`);
      }
    }

    const customerPrefix = `${target.runId}_C_`;
    const markerCustomers = await sql<{ id: string }[]>`
      select id from public.customers
      where left(kode_sap, length(${customerPrefix})) = ${customerPrefix}`;
    const markerStaff = await sql<{ id: string }[]>`
      select id from public.profiles
      where left(full_name, length(${target.runId + ' STAFF '})) = ${target.runId + ' STAFF '}`;
    const knownCustomers = new Set(customerIds);
    const knownStaff = new Set(staffIds);
    if (markerCustomers.some((row) => !knownCustomers.has(row.id))) {
      throw new Error('DITOLAK: ada customer bermarker run yang tidak tercantum di manifest.');
    }
    if (markerStaff.some((row) => !knownStaff.has(row.id))) {
      throw new Error('DITOLAK: ada staff bermarker run yang tidak tercantum di manifest.');
    }

    const [children] = await sql<{ orders: number; reservations: number }[]>`
      select
        (select count(*)::int from public.order_adjustments where customer_id in ${sql(customerIds)}) as orders,
        (select count(*)::int from public.reservations where customer_id in ${sql(customerIds)}) as reservations`;

    console.log(`Cleanup run ${target.runId}:`);
    console.log(`  customer ditemukan : ${existingCustomers.length}/${customerIds.length}`);
    console.log(`  staff ditemukan    : ${existingStaff.length}/${staffIds.length}`);
    console.log(`  order child        : ${children.orders}`);
    console.log(`  reservation child  : ${children.reservations}`);

    await sql.begin(async (tx) => {
      await tx`delete from public.order_adjustments where customer_id in ${tx(customerIds)}`;
      await tx`delete from public.reservations where customer_id in ${tx(customerIds)}`;
      await tx`
        delete from public.customers
        where id in ${tx(customerIds)}
          and left(kode_sap, length(${customerPrefix})) = ${customerPrefix}`;
      await tx`
        delete from public.profiles
        where id in ${tx(staffIds)}
          and left(full_name, length(${target.runId + ' STAFF '})) = ${target.runId + ' STAFF '}`;
    });

    const [sisa] = await sql<{ customers: number; staff: number; orders: number; reservations: number }[]>`
      select
        (select count(*)::int from public.customers where id in ${sql(customerIds)}) as customers,
        (select count(*)::int from public.profiles where id in ${sql(staffIds)}) as staff,
        (select count(*)::int from public.order_adjustments where customer_id in ${sql(customerIds)}) as orders,
        (select count(*)::int from public.reservations where customer_id in ${sql(customerIds)}) as reservations`;
    const bersih = Object.values(sisa).every((count) => count === 0);
    if (!bersih) throw new Error(`Cleanup belum bersih: ${JSON.stringify(sisa)}`);

    tulisActiveRun({ ...active, status: 'cleaned' });
    console.log('  hasil              : BERSIH (semua hitungan sisa = 0)');
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
