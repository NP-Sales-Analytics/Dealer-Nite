import { db, pastikanRunId } from './loadtest-common';

const PROD_HOST = 'pylox.bi-nipponpaint.com';

async function main() {
  const runId = pastikanRunId(process.env.LOADTEST_RUN_ID ?? '');
  if (process.env.TIM_SUDAH_DIBERI_TAHU !== '1') {
    throw new Error('DITOLAK: set TIM_SUDAH_DIBERI_TAHU=1 setelah tim operasional diberi tahu.');
  }
  if (process.env.OBSERVABILITY_SIAP !== '1') {
    throw new Error('DITOLAK: set OBSERVABILITY_SIAP=1 setelah Supabase dan Vercel bisa dipantau.');
  }

  const base = new URL(process.env.BASE_URL ?? '');
  const preview = base.protocol === 'https:' && base.hostname.endsWith('.vercel.app');
  if (base.hostname !== PROD_HOST && !preview) {
    throw new Error(`BASE_URL harus ${PROD_HOST} atau preview *.vercel.app yang tervalidasi.`);
  }

  const sql = db(1, runId);
  try {
    const [markers] = await sql<{ customers: number; profiles: number }[]>`
      select
        (select count(*)::int from public.customers
          where left(kode_sap, 9) = 'LOADTEST_'
             or left(nama_toko, 8) = 'LOADTEST') as customers,
        (select count(*)::int from public.profiles
          where left(full_name, 9) = 'LOADTEST_') as profiles`;
    if (markers.customers || markers.profiles) {
      throw new Error(`DITOLAK: marker lama ditemukan (${JSON.stringify(markers)}).`);
    }

    const [activity] = await sql<{ last_order: Date | null; last_checkin: Date | null }[]>`
      select
        (select max(created_at) from public.order_adjustments) as last_order,
        (select max(checked_in_at) from public.reservations) as last_checkin`;
    const latest = [activity.last_order, activity.last_checkin]
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (latest && Date.now() - latest.getTime() < 10 * 60_000) {
      throw new Error(`DITOLAK: aktivitas bisnis terakhir ${latest.toISOString()}, belum sepi 10 menit.`);
    }

    const [deadline] = await sql<{ value: string | null }[]>`
      select value from public.app_settings where key = 'order_deadline' limit 1`;
    if (deadline?.value && Date.parse(deadline.value) <= Date.now()) {
      throw new Error(`DITOLAK: order_deadline sudah lewat (${deadline.value}).`);
    }

    const triggers = await sql<{ n: number }[]>`
      select count(*)::int as n
      from information_schema.triggers
      where trigger_schema = 'public'
        and event_object_table in ('customers', 'profiles', 'reservations', 'order_adjustments')`;
    const connections = await sql<{ n: number }[]>`
      select count(*)::int as n from pg_stat_activity where datname = current_database()`;

    console.log('PREFLIGHT LULUS');
    console.log(`  run ID              : ${runId}`);
    console.log(`  target              : ${base.origin}`);
    console.log(`  marker lama         : 0`);
    console.log(`  trigger bisnis      : ${triggers[0].n}`);
    console.log(`  koneksi database    : ${connections[0].n}`);
    console.log(`  aktivitas terakhir  : ${latest?.toISOString() ?? 'belum ada'}`);
    console.log(`  order deadline      : ${deadline?.value ?? 'tidak dibatasi'}`);
    console.log('  observability/tim   : dikonfirmasi siap');
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
