-- Contrapeso: banco Supabase
-- Execute este arquivo inteiro no SQL Editor do seu projeto Supabase.

create extension if not exists pgcrypto;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('entrada','saida')),
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  date date not null,
  notes text,
  payment_method text not null default 'conta' check (payment_method in ('conta','cartao')),
  card_id uuid,
  card_purchase_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset text not null,
  "assetType" text not null,
  quantity numeric(18,8) not null check (quantity > 0),
  "avgPrice" numeric(18,8) not null check ("avgPrice" >= 0),
  "currentPrice" numeric(18,8) not null default 0 check ("currentPrice" >= 0),
  "purchaseDate" date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank text not null,
  credit_limit numeric(14,2) not null check (credit_limit > 0),
  closing_day integer not null check (closing_day between 1 and 31),
  due_day integer not null check (due_day between 1 and 31),
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.card_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  category text not null default 'outros',
  purchase_date date not null,
  installments integer not null default 1 check (installments between 1 and 60),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.card_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  reference_month text not null,
  status text not null default 'open' check (status in ('open','paid')),
  paid_at date,
  created_at timestamptz not null default now(),
  unique(user_id, card_id, reference_month)
);

-- Safe upgrades for existing installations.
alter table public.transactions add column if not exists payment_method text not null default 'conta';
alter table public.transactions add column if not exists card_id uuid;
alter table public.transactions add column if not exists card_purchase_id uuid;

create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
create index if not exists investments_user_asset_idx on public.investments(user_id, asset);
create index if not exists credit_cards_user_idx on public.credit_cards(user_id);
create index if not exists card_purchases_user_date_idx on public.card_purchases(user_id, purchase_date desc);
create index if not exists card_purchases_card_idx on public.card_purchases(card_id);
create index if not exists card_invoices_card_month_idx on public.card_invoices(card_id, reference_month);

alter table public.transactions enable row level security;
alter table public.investments enable row level security;
alter table public.credit_cards enable row level security;
alter table public.card_purchases enable row level security;
alter table public.card_invoices enable row level security;

-- Existing policies
 drop policy if exists "Users can view own transactions" on public.transactions;
drop policy if exists "Users can insert own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can view own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own transactions" on public.transactions for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own investments" on public.investments;
drop policy if exists "Users can insert own investments" on public.investments;
drop policy if exists "Users can update own investments" on public.investments;
drop policy if exists "Users can delete own investments" on public.investments;
create policy "Users can view own investments" on public.investments for select using (auth.uid() = user_id);
create policy "Users can insert own investments" on public.investments for insert with check (auth.uid() = user_id);
create policy "Users can update own investments" on public.investments for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own investments" on public.investments for delete using (auth.uid() = user_id);

-- Cards
 drop policy if exists "Users can view own cards" on public.credit_cards;
drop policy if exists "Users can insert own cards" on public.credit_cards;
drop policy if exists "Users can update own cards" on public.credit_cards;
drop policy if exists "Users can delete own cards" on public.credit_cards;
create policy "Users can view own cards" on public.credit_cards for select using (auth.uid() = user_id);
create policy "Users can insert own cards" on public.credit_cards for insert with check (auth.uid() = user_id);
create policy "Users can update own cards" on public.credit_cards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own cards" on public.credit_cards for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own card purchases" on public.card_purchases;
drop policy if exists "Users can insert own card purchases" on public.card_purchases;
drop policy if exists "Users can update own card purchases" on public.card_purchases;
drop policy if exists "Users can delete own card purchases" on public.card_purchases;
create policy "Users can view own card purchases" on public.card_purchases for select using (auth.uid() = user_id);
create policy "Users can insert own card purchases" on public.card_purchases for insert with check (auth.uid() = user_id);
create policy "Users can update own card purchases" on public.card_purchases for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own card purchases" on public.card_purchases for delete using (auth.uid() = user_id);

drop policy if exists "Users can view own card invoices" on public.card_invoices;
drop policy if exists "Users can insert own card invoices" on public.card_invoices;
drop policy if exists "Users can update own card invoices" on public.card_invoices;
drop policy if exists "Users can delete own card invoices" on public.card_invoices;
create policy "Users can view own card invoices" on public.card_invoices for select using (auth.uid() = user_id);
create policy "Users can insert own card invoices" on public.card_invoices for insert with check (auth.uid() = user_id);
create policy "Users can update own card invoices" on public.card_invoices for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own card invoices" on public.card_invoices for delete using (auth.uid() = user_id);
