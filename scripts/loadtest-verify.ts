import { bacaSeededTarget, db } from './loadtest-common';

async function main() {
  const target = bacaSeededTarget();
  const customerIds = target.customers.map((row) => row.id);
  const sql = db(1, target.runId);
  try {
    let lulus = true;

    const minus = await sql<{ customer_id: string; total: number }[]>`
      select customer_id, sum(qty_change)::int as total
      from public.order_adjustments
      where customer_id in ${sql(customerIds)}
      group by customer_id
      having sum(qty_change) < 0`;
    console.log(`  [${minus.length === 0 ? 'LULUS' : 'GAGAL'}] total dummy tidak negatif`);
    if (minus.length) lulus = false;

    const [diBawahAwal] = await sql<{ n: number }[]>`
      select count(*)::int as n from (
        select c.id, c.dus_awal, coalesce(sum(o.qty_change), 0)::int as total
        from public.customers c
        left join public.order_adjustments o on o.customer_id = c.id
        where c.id in ${sql(customerIds)} and c.dus_awal is not null
        group by c.id, c.dus_awal
      ) s where s.total < s.dus_awal`;
    console.log(`  [${diBawahAwal.n === 0 ? 'LULUS' : 'GAGAL'}] total tidak di bawah pengambilan pertama`);
    if (diBawahAwal.n) lulus = false;

    const [dobel] = await sql<{ n: number }[]>`
      select count(*)::int as n from (
        select customer_id from public.reservations
        where customer_id in ${sql(customerIds)}
        group by customer_id having count(*) > 1
      ) s`;
    console.log(`  [${dobel.n === 0 ? 'LULUS' : 'GAGAL'}] tidak ada kehadiran dummy ganda`);
    if (dobel.n) lulus = false;

    const [ringkas] = await sql<{ customers: number; orders: number; reservations: number; total: number }[]>`
      select
        (select count(*)::int from public.customers where id in ${sql(customerIds)}) as customers,
        (select count(*)::int from public.order_adjustments where customer_id in ${sql(customerIds)}) as orders,
        (select count(*)::int from public.reservations where customer_id in ${sql(customerIds)}) as reservations,
        (select coalesce(sum(qty_change), 0)::int from public.order_adjustments
          where customer_id in ${sql(customerIds)}) as total`;
    console.log(`\n  run       : ${target.runId}`);
    console.log(`  customer  : ${ringkas.customers}`);
    console.log(`  ledger    : ${ringkas.orders} baris / ${ringkas.total} dus`);
    console.log(`  kehadiran : ${ringkas.reservations}`);
    console.log(`\nHASIL: ${lulus ? 'LULUS' : 'GAGAL'}`);
    process.exitCode = lulus ? 0 : 1;
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
