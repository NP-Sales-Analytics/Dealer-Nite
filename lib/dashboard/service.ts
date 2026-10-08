import { eq } from 'drizzle-orm';
import { attendanceRate, sortDepots, type DepotRow } from '@/lib/dashboard/compute';
import { matchesDashboardFilter, type DashboardFilter } from '@/lib/dashboard/filters';
import { lengkapiInduk } from '@/lib/dashboard/hierarchy';
import type { AttendanceResponse, AttendanceRow, Summary } from '@/lib/dashboard/types';
import { db } from '@/lib/db';
import { customers, profiles, reservations } from '@/lib/db/schema';
import { bacaTargetPax } from '@/lib/pax-targets';

export async function loadCustomers(dealerNightId: string) {
  return db.select().from(customers).where(eq(customers.dealerNightId, dealerNightId));
}

export async function loadAttendance(dealerNightId: string): Promise<AttendanceRow[]> {
  const rows = await db
    .select({
      id: reservations.id,
      customerId: reservations.customerId,
      isManualEntry: reservations.isManualEntry,
      manualNamaCustomer: reservations.manualNamaCustomer,
      manualDepot: reservations.manualDepot,
      depotOverride: reservations.depotOverride,
      qtyHadir: reservations.qtyHadir,
      nomorUndian: reservations.nomorUndian,
      checkedInAt: reservations.checkedInAt,
      mgName: customers.mgName,
      mgCode: customers.mgCode,
      depotName: customers.depotName,
      wilayah: customers.wilayah,
      region: customers.region,
      paxTerdaftar: customers.qtyUndangan,
      recordedByName: profiles.fullName,
    })
    .from(reservations)
    .leftJoin(customers, eq(reservations.customerId, customers.id))
    .leftJoin(profiles, eq(reservations.checkedInBy, profiles.id))
    .where(eq(reservations.dealerNightId, dealerNightId));

  return rows.map((row) => {
    const depot = row.depotOverride ?? row.depotName ?? row.manualDepot ?? '(Tanpa Depot)';
    const hierarchy = lengkapiInduk(depot, row.region, row.wilayah);
    return {
      id: row.id,
      nama: row.mgName ?? row.manualNamaCustomer ?? 'Tanpa nama',
      depot,
      kodeSap: row.mgCode,
      region: hierarchy.region,
      wilayah: hierarchy.wilayah,
      qtyHadir: row.qtyHadir,
      paxTerdaftar: row.paxTerdaftar,
      nomorUndian: row.nomorUndian,
      checkedInAt: row.checkedInAt.toISOString(),
      isManualEntry: row.isManualEntry,
      depotDiubah: !!row.depotOverride,
      dicatatOleh: row.recordedByName,
    };
  });
}

export async function dashboardSummary(dealerNightId: string, filter: DashboardFilter): Promise<Summary> {
  const [customerRows, attendanceRows, targetPax] = await Promise.all([
    loadCustomers(dealerNightId),
    loadAttendance(dealerNightId),
    bacaTargetPax(dealerNightId),
  ]);
  const filteredCustomers = customerRows.filter((row) => matchesDashboardFilter({
    wilayah: row.wilayah, region: row.region, depot: row.depotName, kodeSap: row.mgCode, nama: row.mgName,
  }, filter));
  const filteredAttendance = attendanceRows.filter((row) => matchesDashboardFilter(row, filter));
  const totalHadir = filteredAttendance.reduce((sum, row) => sum + row.qtyHadir, 0);
  return {
    targetPax,
    totalHadir,
    totalToko: filteredCustomers.length,
    tokoCheckin: filteredAttendance.filter((row) => !row.isManualEntry).length,
    manualEntry: filteredAttendance.filter((row) => row.isManualEntry).length,
    persentase: attendanceRate(totalHadir, targetPax),
  };
}

export async function dashboardByDepot(dealerNightId: string, filter: DashboardFilter): Promise<DepotRow[]> {
  const [customerRows, attendanceRows] = await Promise.all([
    loadCustomers(dealerNightId), loadAttendance(dealerNightId),
  ]);
  const map = new Map<string, DepotRow>();
  const ensure = (depot: string, region: string | null) => {
    const existing = map.get(depot);
    if (existing) return existing;
    const row = { depot, region, qtyHadir: 0, tokoDiundang: 0, tokoHadir: 0 };
    map.set(depot, row);
    return row;
  };
  for (const customer of customerRows) {
    if (!matchesDashboardFilter({ wilayah: customer.wilayah, region: customer.region, depot: customer.depotName }, filter)) continue;
    ensure(customer.depotName, customer.region).tokoDiundang += 1;
  }
  for (const attendance of attendanceRows) {
    if (!matchesDashboardFilter(attendance, filter)) continue;
    const row = ensure(attendance.depot, attendance.region);
    row.qtyHadir += attendance.qtyHadir;
    if (!attendance.isManualEntry) row.tokoHadir += 1;
  }
  return sortDepots([...map.values()]);
}

export async function attendancePage(
  dealerNightId: string,
  filter: DashboardFilter,
  page: number,
  sort: 'asc' | 'desc',
): Promise<AttendanceResponse> {
  const pageSize = 20;
  const rows = (await loadAttendance(dealerNightId))
    .filter((row) => matchesDashboardFilter(row, filter))
    .sort((left, right) => {
      const difference = Date.parse(left.checkedInAt) - Date.parse(right.checkedInAt);
      return sort === 'asc' ? difference : -difference;
    });
  const total = rows.length;
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function dashboardFilterOptions(dealerNightId: string) {
  const rows = await loadAttendance(dealerNightId);
  const depots = [...new Map(rows.map((row) => [row.depot, {
    depot: row.depot, region: row.region, wilayah: row.wilayah,
  }])).values()].sort((left, right) => left.depot.localeCompare(right.depot, 'id'));
  return {
    wilayahs: [...new Set(depots.map((row) => row.wilayah).filter((value): value is string => !!value))].sort(),
    regions: [...new Map(depots.filter((row) => row.region).map((row) => [row.region!, {
      region: row.region!, wilayah: row.wilayah,
    }])).values()].sort((left, right) => left.region.localeCompare(right.region, 'id')),
    depots,
  };
}
