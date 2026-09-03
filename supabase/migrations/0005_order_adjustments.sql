-- Ledger order: satu baris per penambahan/pengurangan dus. Total = SUM(qty_change).
-- Ledger (bukan kolom counter) menghindari lost-update saat banyak customer submit
-- bersamaan, sekaligus memberi jejak audit. Lihat spec bagian 3.
create table public.order_adjustments (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  qty_change  integer not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- Agregasi leaderboard SUM(qty_change) per customer bertumpu pada index ini.
create index idx_order_adjustments_customer on public.order_adjustments(customer_id);

-- Aplikasi menulis lewat role postgres (BYPASSRLS). Policy SELECT di bawah HANYA
-- agar anon client menerima event Realtime; ledger tidak sensitif (customer_id,
-- qty, waktu) dan leaderboard memang publik. Tidak ada policy INSERT: anon key
-- tidak bisa menulis.
alter table public.order_adjustments enable row level security;
create policy "anon read for realtime" on public.order_adjustments
  for select to anon, authenticated using (true);

-- Realtime postgres_changes butuh tabel ada di publikasi ini (default Supabase).
alter publication supabase_realtime add table public.order_adjustments;
