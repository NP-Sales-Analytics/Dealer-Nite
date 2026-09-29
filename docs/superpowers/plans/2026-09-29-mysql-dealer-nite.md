# MySQL Dealer Nite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah aplikasi Pylox menjadi aplikasi Dealer Nite berbasis MySQL yang mencatat Target DN, membatasi akses akun DN ke satu acara, dan tidak lagi bergantung pada Supabase.

**Architecture:** MySQL 8 menjadi satu-satunya database melalui Drizzle `mysql2`. Target awal disimpan pada customer dan seluruh perubahan disimpan sebagai ledger selisih yang ditulis dalam transaksi ber-row-lock; target efektif dibaca sebagai nilai awal ditambah total ledger. Autentikasi hanya untuk akun internal dengan password unik, sedangkan visibilitas data diputuskan oleh role global atau `dealerNightId` pada akun `dn_user`.

**Tech Stack:** Next.js 15, React 19, TypeScript, Drizzle ORM, mysql2, Zod, Vitest, MySQL 8, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-29-mysql-dealer-nite-design.md`

## Global Constraints

- MySQL target minimal versi 8.0, charset `utf8mb4`, dan koneksi timezone UTC.
- Database produksi bernama `pylox_dn`; database integrasi bernama `pylox_dn_test`.
- Target efektif minimum adalah Rp50.000.000 dan seluruh nominal disimpan sebagai integer rupiah `BIGINT`.
- Login hanya memakai password unik; tidak ada login customer, role RSM, atau autentikasi Supabase.
- `dn_user` hanya dapat melihat satu Dealer Night dan tidak dapat menyesuaikan target.
- `superadmin` dan `admin` dapat menyesuaikan seluruh target; `marketing` dan `management` melihat seluruh data dan dapat mengunduh.
- Repository push adalah `NP-Sales-Analytics/Dealer-Nite`; `pylox-archive` tidak boleh menerima push.
- Jangan stage atau commit `public/Password RSM.xlsx` maupun file lock Excel `public/~$Password RSM.xlsx`.

## Review Focus

- Target CSV mengandung pemisah ribuan, spasi, atau karakter nonangka: parser harus menghasilkan integer rupiah yang tepat atau menolak baris dengan nomor baris yang jelas.
- Dua penyesuaian bersamaan pada toko yang sama: transaksi `FOR UPDATE` harus mencegah lost update dan mempertahankan kedua ledger.
- `dn_user` mengubah query string/body ke Dealer Night lain: server harus tetap membalas 403 tanpa membocorkan data.
- Target baru tepat Rp50 juta harus diterima; Rp49.999.999 dan nilai di luar integer aman harus ditolak.
- Seed dijalankan ulang setelah ada penyesuaian: metadata dan target awal boleh diperbarui sesuai CSV, tetapi ledger serta target efektif yang berasal dari ledger tidak boleh terhapus.

---

### Task 1: MySQL connection, schema, and migration

**Files:**
- Create: `mysql/migrations/0001_init.sql`
- Create: `tests/mysql-schema.test.ts`
- Modify: `lib/db/index.ts`
- Replace: `lib/db/schema/*.ts`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**
- Produces: `db`, `mysqlPool`, and tables `dealerNights`, `profiles`, `customers`, `targetAdjustments`, `reservations`, `depotPaxTargets`, `appSettings`.
- Produces: `Role = 'superadmin' | 'admin' | 'marketing' | 'management' | 'dn_user'`.

- [ ] **Step 1: Write the failing MySQL schema integration test**

Install the driver before importing it in the test; no application code exists yet:

```bash
npm install --save-exact mysql2@3.24.4
```

```ts
import { describe, expect, it } from 'vitest';
import { createPool } from 'mysql2/promise';

const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('MySQL schema', () => {
  it('creates all Dealer Nite tables and constraints', async () => {
    const pool = createPool(url!);
    const [tables] = await pool.query<{ TABLE_NAME: string }[]>(
      `select table_name as TABLE_NAME from information_schema.tables
       where table_schema = database()`,
    );
    expect(tables.map((r) => r.TABLE_NAME)).toEqual(expect.arrayContaining([
      'dealer_nights', 'profiles', 'customers', 'target_adjustments',
      'reservations', 'depot_pax_targets', 'app_settings',
    ]));
    await pool.end();
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/mysql-schema.test.ts`

Expected: FAIL because `mysql2` and the MySQL schema do not exist.

- [ ] **Step 3: Replace PostgreSQL dependencies and define MySQL tables**

Use `drizzle-orm/mysql-core` with these persisted shapes:

```ts
export const roles = ['superadmin', 'admin', 'marketing', 'management', 'dn_user'] as const;

export const dealerNights = mysqlTable('dealer_nights', {
  id: varchar('id', { length: 36 }).primaryKey(),
  slug: varchar('slug', { length: 80 }).notNull().unique(),
  name: varchar('name', { length: 160 }).notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`CURRENT_TIMESTAMP(3)`),
});

export const customers = mysqlTable('customers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  dealerNightId: varchar('dealer_night_id', { length: 36 }).notNull(),
  mgCode: varchar('mg_code', { length: 32 }).notNull(),
  mgName: varchar('mg_name', { length: 200 }).notNull(),
  sotpCode: varchar('sotp_code', { length: 32 }).notNull(),
  sotpName: varchar('sotp_name', { length: 200 }).notNull(),
  depotCode: varchar('depot_code', { length: 20 }).notNull(),
  depotName: varchar('depot_name', { length: 120 }).notNull(),
  wilayah: varchar('wilayah', { length: 120 }),
  region: varchar('region', { length: 40 }),
  salesman: varchar('salesman', { length: 200 }),
  spv: varchar('spv', { length: 200 }),
  targetDnAwal: bigint('target_dn_awal', { mode: 'number' }).notNull(),
  qtyUndangan: int('qty_undangan').notNull().default(1),
});
```

Add composite unique `(dealer_night_id, mg_code)`, foreign keys, indexes, `profiles.dealer_night_id`, and a nullable-unique `reservations.customer_id`. Remove `postgres` and both Supabase packages; add pinned `mysql2` and a migration script that executes `mysql/migrations/0001_init.sql` against the selected URL.

- [ ] **Step 4: Configure the MySQL pool**

`lib/db/index.ts` must parse `DATABASE_URL`, use `connectionLimit: 5`, `waitForConnections: true`, `queueLimit: 0`, and `timezone: 'Z'`, then export both the pool and `drizzle(pool, { schema, mode: 'default' })`.

- [ ] **Step 5: Apply the migration to `pylox_dn_test` and verify GREEN**

Run: `npm run db:migrate -- --url-env TEST_DATABASE_URL`

Run: `npm test -- tests/mysql-schema.test.ts`

Expected: PASS with every table present.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example lib/db mysql tests/mysql-schema.test.ts
git commit -m "feat(db): add MySQL Dealer Nite schema"
```

### Task 2: Master CSV parser, target rules, and rupiah formatting

**Files:**
- Create: `lib/csv/parse-dealer-night.ts`
- Create: `lib/target/money.ts`
- Create: `lib/target/rules.ts`
- Create: `tests/parse-dealer-night.test.ts`
- Create: `tests/target-money.test.ts`
- Remove: `lib/csv/parse-customers.ts`
- Remove: `tests/parse-customers.test.ts`

**Interfaces:**
- Produces: `parseDealerNightCsv(csv: string, hierarchyCsv: string): DealerNightMasterRow[]`.
- Produces: `MIN_TARGET_DN`, `validateTargetDn(value: number)`, `formatRupiah(value: number)`, and `formatRupiahRingkas(value: number)`.

- [ ] **Step 1: Write failing parser and money tests**

```ts
it('maps Bogor master fields and parses rupiah', () => {
  const [row] = parseDealerNightCsv(MASTER_ONE_ROW, HIERARCHY);
  expect(row).toMatchObject({
    mgCode: '632723', mgName: 'CV. HALIM JAYA BERSAMA',
    depotCode: '1S', depotName: '1S Bogor', wilayah: 'Indonesia Barat',
    region: '4', targetDnAwal: 5_619_000_000, qtyUndangan: 1,
  });
});

it('formats compact target values without wasting space', () => {
  expect(formatRupiahRingkas(5_619_000_000)).toBe('Rp5,62 M');
  expect(formatRupiahRingkas(820_000_000)).toBe('Rp820 jt');
  expect(formatRupiah(820_000_000)).toBe('Rp820.000.000');
});

it('accepts 50 million and rejects anything lower', () => {
  expect(validateTargetDn(50_000_000)).toBe(50_000_000);
  expect(() => validateTargetDn(49_999_999)).toThrow('minimal Rp50.000.000');
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/parse-dealer-night.test.ts tests/target-money.test.ts`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement strict parsing and formatting**

`parseDealerNightCsv` must require all eight CSV headers, reject blank or duplicate MG Code, verify the depot against `Hierarchy Depot.csv`, remove non-digits from Target DN, require a safe integer at least `MIN_TARGET_DN`, uppercase store names, and include the source row number in thrown errors. Use `Intl.NumberFormat('id-ID')` for full rupiah and decimal-aware division for `jt`/`M` compact labels.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- tests/parse-dealer-night.test.ts tests/target-money.test.ts`

Expected: PASS, including a fixture for the Rp53 juta DIAN JAYA row.

- [ ] **Step 5: Commit**

```bash
git add lib/csv lib/target tests/parse-dealer-night.test.ts tests/target-money.test.ts tests/parse-customers.test.ts
git commit -m "feat(target): parse Dealer Night masters and rupiah values"
```

### Task 3: Password-only internal authentication and Dealer Night authorization

**Files:**
- Modify: `lib/auth.ts`
- Modify: `lib/access.ts`
- Modify: `lib/session.ts`
- Modify: `app/(auth)/login/actions.ts`
- Modify: `app/(app)/admin/users/actions.ts`
- Modify: `components/admin/user-form-dialog.tsx`
- Modify: `components/admin/user-table.tsx`
- Modify: `components/shared/app-sidebar.tsx`
- Modify: `middleware.ts`
- Create: `tests/dealer-night-access.test.ts`
- Modify: `tests/session.test.ts`

**Interfaces:**
- Produces: `Session = { kind: 'team'; id: string }`.
- Produces: `canReadDealerNight(user, dealerNightId): boolean` and `canAdjustTarget(user, dealerNightId): boolean`.
- Produces: `SessionUser.dealerNightId: string | null`.

- [ ] **Step 1: Write failing authorization tests**

```ts
it('limits dn_user to its assigned Dealer Night', () => {
  const user = { role: 'dn_user', dealerNightId: 'bogor' } as const;
  expect(canReadDealerNight(user, 'bogor')).toBe(true);
  expect(canReadDealerNight(user, 'bandung')).toBe(false);
  expect(canAdjustTarget(user, 'bogor')).toBe(false);
});

it.each(['superadmin', 'admin'] as const)('%s may adjust every Dealer Night', (role) => {
  expect(canAdjustTarget({ role, dealerNightId: null }, 'bogor')).toBe(true);
});

it.each(['marketing', 'management'] as const)('%s is read-only', (role) => {
  expect(canReadDealerNight({ role, dealerNightId: null }, 'bogor')).toBe(true);
  expect(canAdjustTarget({ role, dealerNightId: null }, 'bogor')).toBe(false);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/dealer-night-access.test.ts tests/session.test.ts`

Expected: FAIL because old customer/RSM roles and session kinds still exist.

- [ ] **Step 3: Implement the new role and session model**

Remove customer login lookup and `SessionKind = 'customer'`. Login searches only `profiles.passwordHash`; admin creation requires a Dealer Night only for `dn_user`. Replace region scope helpers with explicit Dealer Night predicates, and make server routes reject cross-DN access even when a caller changes request parameters.

- [ ] **Step 4: Update navigation and user management**

Remove customer/RSM options and region selectors. Add Management and Akun DN labels. Show the assigned Dealer Night in the user table and keep password uniqueness checks.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test -- tests/dealer-night-access.test.ts tests/session.test.ts tests/access-scope.test.ts`

Expected: PASS after replacing obsolete region-scope assertions with Dealer Night assertions.

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts lib/access.ts lib/session.ts app components/admin components/shared middleware.ts tests
git commit -m "feat(auth): restrict access by Dealer Night account"
```

### Task 4: Idempotent DN Bogor seed and account bootstrap

**Files:**
- Create: `scripts/seed-dealer-night.ts`
- Create: `scripts/bootstrap-admin.ts`
- Create: `tests/seed-dealer-night.test.ts`
- Modify: `package.json`
- Modify: `.env.example`
- Remove: `scripts/seed-customers.ts`

**Interfaces:**
- Produces: `seedDealerNight({ file, hierarchyFile, slug, name, db }): Promise<{ inserted: number; updated: number }>`.
- Produces CLI: `npm run seed:dealer-night -- --file "Master_Toko Bogor.csv" --slug bogor --name "DN Bogor"`.
- Produces CLI: `npm run bootstrap:admin`, consuming `BOOTSTRAP_ADMIN_PASSWORD` and `BOOTSTRAP_ADMIN_NAME`.

- [ ] **Step 1: Write failing seed tests**

```ts
it('seeds DN Bogor idempotently without erasing adjustments', async () => {
  const first = await seedDealerNight({
    file: 'Master_Toko Bogor.csv',
    hierarchyFile: 'public/Hierarchy Depot.csv',
    slug: 'bogor',
    name: 'DN Bogor',
    db,
  });
  expect(first).toEqual({ inserted: 113, updated: 0 });
  const [customer] = await findCustomerByMgCode(db, '632723');
  await insertAdjustment(db, customer.id, 1_000_000);

  const second = await seedDealerNight({
    file: 'Master_Toko Bogor.csv',
    hierarchyFile: 'public/Hierarchy Depot.csv',
    slug: 'bogor',
    name: 'DN Bogor',
    db,
  });
  expect(second).toEqual({ inserted: 0, updated: 113 });
  expect(await countCustomers(db, 'bogor')).toBe(113);
  expect(await countAdjustments(db, customer.id)).toBe(1);
  expect(await distinctInvitationQuantities(db, 'bogor')).toEqual([1]);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/seed-dealer-night.test.ts`

Expected: FAIL because the seed service does not exist.

- [ ] **Step 3: Implement transactional seed and bootstrap**

Generate UUIDs with `crypto.randomUUID()`. Upsert Dealer Night by slug and customer by `(dealerNightId, mgCode)`. Update master metadata and `targetDnAwal`, never delete target ledger rows. Bootstrap refuses an empty/short password, hashes it with the existing HMAC mechanism, and upserts one superadmin without printing the password.

- [ ] **Step 4: Verify against the test database**

Run: `npm run seed:dealer-night -- --file "Master_Toko Bogor.csv" --slug bogor --name "DN Bogor"` with `DATABASE_URL` pointed to `pylox_dn_test`.

Run a read-only verification query asserting 113 customers, two depots, minimum target Rp53 juta, and total target Rp42.955.000.000.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test -- tests/seed-dealer-night.test.ts tests/parse-dealer-night.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scripts package.json package-lock.json .env.example tests/seed-dealer-night.test.ts "Master_Toko Bogor.csv"
git commit -m "feat(seed): import DN Bogor master data"
```

### Task 5: Target ledger service and APIs

**Files:**
- Create: `lib/target/service.ts`
- Create: `lib/validations/target.ts`
- Create: `app/api/targets/leaderboard/route.ts`
- Create: `app/api/targets/list/route.ts`
- Create: `app/api/targets/history/route.ts`
- Create: `app/api/targets/adjust/route.ts`
- Create: `app/api/targets/export/route.ts`
- Create: `tests/target-service.test.ts`
- Create: `tests/target-schema.test.ts`
- Remove: `app/api/order/**`
- Remove: `lib/order/**`

**Interfaces:**
- Consumes: MySQL tables from Task 1 and authorization helpers from Task 3.
- Produces: `adjustTarget({ customerId, newTarget, actorId }): Promise<TargetSnapshot>`.
- Produces: `TargetSnapshot = { customerId: string; targetAwal: number; targetEfektif: number; delta: number }`.

- [ ] **Step 1: Write failing validation and service tests**

```ts
it('stores the delta from the requested absolute target', async () => {
  const result = await adjustTarget({ customerId, newTarget: 900_000_000, actorId });
  expect(result).toMatchObject({ targetAwal: 820_000_000, targetEfektif: 900_000_000, delta: 80_000_000 });
});

it('allows decreases but not below Rp50 million', async () => {
  await expect(adjustTarget({ customerId, newTarget: 50_000_000, actorId })).resolves.toBeDefined();
  await expect(adjustTarget({ customerId, newTarget: 49_999_999, actorId })).rejects.toMatchObject({ code: 'BELOW_MINIMUM' });
});
```

Add a concurrent test that starts two adjustments against the same customer and verifies the resulting ledger is serializable with no lost update.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/target-schema.test.ts tests/target-service.test.ts`

Expected: FAIL because target service and schemas do not exist.

- [ ] **Step 3: Implement transactional adjustment**

Within one MySQL transaction execute `SELECT target_dn_awal FROM customers WHERE id = ? FOR UPDATE`, sum the existing ledger, validate the requested absolute target, insert only a nonzero delta, and return the effective target. Every API first resolves the customer Dealer Night and calls `canReadDealerNight` or `canAdjustTarget` on the server.

- [ ] **Step 4: Implement read APIs and ranking**

Leaderboard query groups by customer and sorts `targetDnAwal + COALESCE(SUM(delta), 0) DESC`, then most recent adjustment ascending with MG Name as the final deterministic tie-breaker. List/history/export endpoints use the same target expression and Dealer Night predicate.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `npm test -- tests/target-schema.test.ts tests/target-service.test.ts`

Expected: PASS, including the concurrency and cross-DN authorization cases.

- [ ] **Step 6: Commit**

```bash
git add lib/target lib/validations app/api/targets tests/target-schema.test.ts tests/target-service.test.ts app/api/order lib/order
git commit -m "feat(target): add audited Target DN adjustments"
```

### Task 6: Target DN interface, leaderboard, history, and exports

**Files:**
- Rename/modify: `components/order/*` to `components/target/*`
- Modify: `components/leaderboard/*`
- Modify: `app/(app)/order/**` to Target DN pages while preserving stable routes only where bookmarks require them
- Modify: `app/(app)/leaderboard/page.tsx`
- Modify: `components/shared/app-sidebar.tsx`
- Create: `tests/target-form.test.ts`
- Modify: browser verification scripts under `scripts/check-*.ts`

**Interfaces:**
- Consumes: target APIs from Task 5 and money helpers from Task 2.
- Produces: target form that submits `{ customerId, newTarget }`, read-only leaderboard, detail/history views, and full-value XLSX/CSV export.

- [ ] **Step 1: Write failing target-form tests**

```ts
it.each(['900.000.000', 'Rp 900.000.000', '900000000'])(
  'normalizes %s to integer rupiah',
  (input) => expect(parseRupiahInput(input)).toBe(900_000_000),
);

it('builds an absolute-target request and rejects below-minimum values', () => {
  expect(buildTargetAdjustment('customer-1', '900.000.000')).toEqual({
    customerId: 'customer-1', newTarget: 900_000_000,
  });
  expect(() => buildTargetAdjustment('customer-1', '49.999.999')).toThrow(
    'minimal Rp50.000.000',
  );
});

it('uses Target DN copy rather than old order units', () => {
  const copy = targetFormCopy({ currentTarget: 820_000_000 });
  expect(copy.current).toContain('Rp820.000.000');
  expect(JSON.stringify(copy)).not.toMatch(/dus|Tambah Order/i);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/target-form.test.ts`

Expected: FAIL because the old order form uses quantity/dus semantics.

- [ ] **Step 3: Build the target interface**

Replace steppers with a numeric currency field that formats separators while typing, shows old target -> delta -> new target, and submits only on explicit save. Rename navigation and copy to `Leaderboard Target DN`, `Penyesuaian Target`, `Detail Target`, and `Riwayat Penyesuaian`.

- [ ] **Step 4: Make role behavior visible and enforced**

Show edit controls only to superadmin/admin. Marketing, management, and `dn_user` receive the same read-only data shape without mutation buttons. Add a Dealer Night selector for global roles and a fixed event label for `dn_user`.

- [ ] **Step 5: Replace realtime with visibility-aware polling**

Use React Query `refetchInterval: 10_000`, return `false` when `document.visibilityState !== 'visible'`, and invalidate once on `visibilitychange` to visible. Do not create WebSocket channels.

- [ ] **Step 6: Run tests and browser checks**

Run: `npm test -- tests/target-form.test.ts tests/leaderboard.test.ts`

Run the app against `pylox_dn_test`, then verify desktop and 375px flows: login, choose DN Bogor, leaderboard compact amounts, open detail, adjust upward/downward, see history, and export.

- [ ] **Step 7: Commit**

```bash
git add app components scripts tests/target-form.test.ts tests/leaderboard.test.ts
git commit -m "feat(ui): replace order flow with Target DN adjustments"
```

### Task 7: Port attendance, dashboard, filters, and utilities to MySQL

**Files:**
- Modify: `app/api/reservations/**`
- Modify: `app/api/customers/search/route.ts`
- Modify: `app/api/dashboard/**`
- Modify: `app/api/kehadiran/**`
- Modify: `lib/dashboard/**`
- Modify: `lib/pax-targets.ts`
- Modify: `lib/settings.ts`
- Modify: related load-test scripts
- Remove: `app/(app)/setting/waktu/**`
- Remove: Supabase realtime scripts and tests

**Interfaces:**
- Consumes: MySQL schema and Dealer Night authorization.
- Produces: existing attendance/dashboard behavior scoped by Dealer Night, with `qtyUndangan = 1`.

- [ ] **Step 1: Add failing regression tests for MySQL query behavior**

```ts
it('allows multiple manual reservations but one reservation per customer', async () => {
  await insertManualReservation(db, { nama: 'Tamu A' });
  await insertManualReservation(db, { nama: 'Tamu B' });
  await insertCustomerReservation(db, customerId);
  await expect(insertCustomerReservation(db, customerId)).rejects.toMatchObject({ code: 'ER_DUP_ENTRY' });
});

it('builds parameterized MySQL multi-value filters', () => {
  const condition = mysqlInFilter('depot_code', ['1S', '5C']);
  expect(condition.sql).toBe('depot_code IN (?, ?)');
  expect(condition.params).toEqual(['1S', '5C']);
});

it('keeps a DN account out of another event dashboard', async () => {
  const request = loadDashboard({ user: dnBogorUser, dealerNightId: bandungId });
  await expect(request).rejects.toMatchObject({ status: 403 });
});

it('orders missing timestamps last in both directions', () => {
  expect(mysqlNullsLast('last_at', 'asc')).toBe('last_at IS NULL ASC, last_at ASC');
  expect(mysqlNullsLast('last_at', 'desc')).toBe('last_at IS NULL ASC, last_at DESC');
});
```

Add integration fixtures asserting `LIKE '%halim%'` finds `CV. HALIM JAYA BERSAMA` and depot totals use the hierarchy metadata rather than PostgreSQL `mode()`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/dashboard-scope.test.ts tests/dashboard-compute.test.ts tests/reservation-schema.test.ts`

Expected: FAIL against the new schema until PostgreSQL assumptions are removed.

- [ ] **Step 3: Rewrite PostgreSQL-specific queries**

Remove `public.` qualifiers, `::int`, `ILIKE`, `ANY(text[])`, `NULLS LAST`, `FILTER`, `FULL OUTER JOIN`, `mode() within group`, advisory locks, and `RETURNING`. Use MySQL casts, case-insensitive `LIKE`, parameterized `IN`, boolean `SUM(condition)`, unioned depot keys plus left joins, deterministic depot metadata selected from the hierarchy, `FOR UPDATE`, and affected-row counts.

- [ ] **Step 4: Remove obsolete deadline and realtime artifacts**

Delete the deadline page/API calls, Supabase browser client, realtime lifecycle modules/tests, `cek:sinkron`, `cek:badai`, and Supabase environment keys. Keep only visibility-aware HTTP polling.

- [ ] **Step 5: Run all tests and build**

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

Expected: all commands exit 0 with no Supabase/PostgreSQL runtime imports.

- [ ] **Step 6: Commit**

```bash
git add app lib scripts tests package.json package-lock.json .env.example README.md
git commit -m "refactor: port attendance and dashboard to MySQL"
```

### Task 8: Provision, verify, and publish Dealer-Nite

**Files:**
- Modify: `README.md`
- Modify: `RUNBOOK-EVENT.md`
- Modify: `.gitignore` if local secret artifacts are not already excluded
- Modify: Vercel environment configuration outside the repository

**Interfaces:**
- Consumes: completed application and migration scripts.
- Produces: initialized `pylox_dn_test`, initialized `pylox_dn`, bootstrap superadmin, seeded DN Bogor, and GitHub `Dealer-Nite` main branch.

- [ ] **Step 1: Verify server capabilities without changing production data**

Connect using the supplied credentials without echoing them. Query `SELECT VERSION()`, `SHOW VARIABLES LIKE 'character_set_server'`, `SHOW VARIABLES LIKE 'time_zone'`, connection limits, and account grants. Confirm MySQL 8 semantics; stop and report if the server is MariaDB or older than MySQL 8.

- [ ] **Step 2: Create and verify the test database**

Create `pylox_dn_test` with `utf8mb4`, grant only required privileges to the application account, apply `0001_init.sql`, seed DN Bogor, bootstrap a temporary test admin from environment, and execute the complete smoke test. Drop only test rows created by the smoke test, never the schema or master data during verification.

- [ ] **Step 3: Run final local verification**

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

Run: `rg -n -i "supabase|postgres-js|pg_advisory|ILIKE|::int|order_adjustments|dus" app lib components scripts package.json .env.example README.md`

Expected: no active runtime references; historical design documents may still mention the removed stack.

- [ ] **Step 4: Initialize production database**

Create `pylox_dn`, apply the migration, seed `Master_Toko Bogor.csv`, create the real superadmin from environment, and verify counts: 1 Dealer Night, 113 customers, 81 depot-code 1S, 32 depot-code 5C, total target Rp42.955.000.000, and no target adjustments.

- [ ] **Step 5: Configure deployment and smoke test**

Set `DATABASE_URL`, `AUTH_SECRET`, and rate-limit variables in Vercel without committing secrets. Deploy, then verify login, scoped DN view, leaderboard, attendance, target adjustment, history, and export. Confirm a `dn_user` receives 403 for a different Dealer Night and all target values render correctly on mobile.

- [ ] **Step 6: Rotate exposed infrastructure credentials**

Rotate the SSH and database passwords that were shared in chat, update deployment secrets, and re-run connection plus login smoke tests.

- [ ] **Step 7: Publish only to Dealer-Nite**

```bash
git remote get-url origin
git status --short
git log --oneline --decorate -10
git push -u origin HEAD:main
```

Expected remote URL: `https://github.com/NP-Sales-Analytics/Dealer-Nite.git`. Do not push `pylox-archive`.

- [ ] **Step 8: Final report**

Report commit IDs, test/build results, production table counts, deployed URL if configured, remaining operational notes, and confirmation that credential rotation completed. Do not include any secret value in the report.
