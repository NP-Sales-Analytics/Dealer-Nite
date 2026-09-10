import { eq, sql } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionUser, lupakanCustomer } from '@/lib/auth';
import { db } from '@/lib/db';
import { customers, orderAdjustments } from '@/lib/db/schema';
import { bolehUbahOrder, PESAN_LUAR_REGION } from '@/lib/order/akses';
import { periksaPenambahan, PESAN_TOLAKAN, type Tolakan } from '@/lib/order/aturan';
import { rateLimit } from '@/lib/rate-limit';
import { getSession } from '@/lib/session';
import { bacaTenggat } from '@/lib/settings';
import { orderAdjustSchema } from '@/lib/validations/order';

// Siapa yang boleh mencatat order atas nama toko (staff on-behalf). RSM ikut,
// tapi dikunci ke region-nya lewat bolehUbahOrder di bawah.
const STAFF_ORDER_ROLES = ['superadmin', 'admin_rsvp', 'rsm'] as const;

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Belum login' }, { status: 401 });

  const parsed = orderAdjustSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ code: 'INVALID', issues: parsed.error.issues }, { status: 400 });
  }
  const { qtyChange } = parsed.data;

  // Tentukan toko sasaran + siapa pencatat. customer_id TIDAK pernah dari body
  // untuk sesi customer - selalu dari sesi, supaya toko tidak bisa mengubah data toko lain.
  let targetId: string;
  let recordedBy: string | null = null;
  if (session.kind === 'customer') {
    targetId = session.id;
  } else {
    const user = await getSessionUser();
    if (!user || !STAFF_ORDER_ROLES.includes(user.role as (typeof STAFF_ORDER_ROLES)[number])) {
      return NextResponse.json({ error: 'Tidak punya akses' }, { status: 403 });
    }
    if (!parsed.data.customerId) {
      return NextResponse.json({ code: 'INVALID', error: 'customerId wajib untuk staff' }, { status: 400 });
    }
    targetId = parsed.data.customerId;
    recordedBy = user.id;

    // Ditegakkan DI SINI, bukan sekadar dengan menyaring hasil pencarian:
    // customerId datang dari body, jadi RSM bisa saja mengirim id toko region
    // lain. Catatan: pembatasan ini hanya untuk mencatat order - papan Top
    // Spender tetap memperlihatkan seluruh toko kepada semua peran tim.
    if (!(await bolehUbahOrder(user, targetId))) {
      return NextResponse.json({ error: PESAN_LUAR_REGION }, { status: 403 });
    }
  }

  const { ok } = await rateLimit(`order-adjust:${session.kind}:${session.id}`);
  if (!ok) return NextResponse.json({ error: 'Terlalu banyak permintaan' }, { status: 429 });

  const tenggat = await bacaTenggat();

  // Transaksi + advisory lock per-toko men-serialkan baca-cek-tulis satu toko, jadi
  // dua penambahan hampir bersamaan tidak bisa sama-sama lolos cek.
  // ponytail: advisory lock per-toko. Naikkan ke trigger/constraint kalau kelak perlu.
  const hasil = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${targetId}, 0))`);

    // Total dan dus_awal DIGABUNG jadi satu round trip, bukan dua select
    // terpisah. Database ada di region lain dari fungsinya (Seoul vs Singapura),
    // jadi tiap round trip menambah RTT penuh - uji beban menunjukkan satu
    // transaksi lengkap makan ~1 detik bahkan tanpa persaingan sama sekali,
    // dan sebagian besar itu memang giliran bolak-balik ini, bukan query itu
    // sendiri. Dibaca di dalam transaksi, bukan dari cache: nilainya ikut
    // menentukan keputusan, jadi harus versi terbaru.
    const [toko] = (await tx.execute(sql`
      select c.dus_awal as "dusAwal",
             coalesce(sum(oa.qty_change), 0)::int as total
      from public.customers c
      left join public.order_adjustments oa on oa.customer_id = c.id
      where c.id = ${targetId}
      group by c.id, c.dus_awal
    `)) as unknown as { dusAwal: number | null; total: number }[];
    if (!toko) return { tolakan: 'NOT_FOUND' as const, total: 0 };

    const totalBaru = toko.total + qtyChange;
    // selisih ikut diperiksa: inilah jalur penambahan, tempat salah ketik satu
    // nol paling mungkin terjadi. Koreksi absolut admin lewat Detail Order tidak
    // melewati sini, jadi otoritasnya tidak ikut terbatasi.
    const tolakan = periksaPenambahan({
      totalBaru,
      dusAwal: toko.dusAwal,
      tenggat,
      selisih: qtyChange,
    });
    if (tolakan) return { tolakan, total: toko.total };

    await tx.insert(orderAdjustments).values({ customerId: targetId, qtyChange, recordedBy });

    // Pengambilan pertama yang tercatat menjadi lantai permanen.
    const awalBaru = toko.dusAwal === null && totalBaru > 0 ? totalBaru : null;
    if (awalBaru !== null) {
      await tx.update(customers).set({ dusAwal: awalBaru }).where(eq(customers.id, targetId));
    }

    return { tolakan: null, total: totalBaru, dusAwal: toko.dusAwal ?? awalBaru, awalBaru };
  });

  if (hasil.tolakan === 'NOT_FOUND') {
    return NextResponse.json({ code: 'NOT_FOUND', error: 'Toko tidak ditemukan' }, { status: 404 });
  }
  if (hasil.tolakan) {
    const kode = hasil.tolakan as NonNullable<Tolakan>;
    return NextResponse.json(
      { code: kode, message: PESAN_TOLAKAN[kode], total: hasil.total },
      { status: 409 },
    );
  }

  // dus_awal ikut di-cache bersama identitas toko; buang supaya lantai barunya
  // terbaca. Hanya saat baru DITETAPKAN - dulu ini ikut jalan di setiap
  // penambahan, dan sejak cache identitas jadi satu peta untuk semua toko,
  // pembuangan sesering itu berarti memuat ulang seluruh tabel tiap order.
  if (hasil.awalBaru !== null) lupakanCustomer();

  return NextResponse.json({ total: hasil.total, dusAwal: hasil.dusAwal });
}
