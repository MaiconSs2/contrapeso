-- Contrapeso — migração completa de contas e cartões
create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'corrente' check (type in ('corrente','poupanca','dinheiro')),
  initial_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('entrada','saida')),
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  category text not null,
  date date not null,
  notes text,
  payment_method text not null default 'conta',
  card_id uuid,
  card_purchase_id uuid,
  account_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  asset text not null, "assetType" text not null, quantity numeric(18,8) not null check (quantity > 0),
  "avgPrice" numeric(18,8) not null check ("avgPrice" >= 0), "currentPrice" numeric(18,8) not null default 0 check ("currentPrice" >= 0),
  "purchaseDate" date not null, created_at timestamptz not null default now()
);

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, bank text not null,
  credit_limit numeric(14,2) default 0,
  closing_day integer,
  due_day integer,
  color text,
  card_type text not null default 'credito' check (card_type in ('credito','debito','alimentacao','refeicao','beneficio')),
  account_id uuid,
  initial_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.card_purchases (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade, description text not null,
  amount numeric(14,2) not null check (amount > 0), category text not null default 'outros', purchase_date date not null,
  installments integer not null default 1 check (installments between 1 and 60), notes text, created_at timestamptz not null default now()
);

create table if not exists public.card_invoices (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.credit_cards(id) on delete cascade, reference_month text not null,
  status text not null default 'open' check (status in ('open','paid')), paid_at date, created_at timestamptz not null default now(),
  unique(user_id, card_id, reference_month)
);

-- Upgrades for existing databases.
alter table public.transactions add column if not exists payment_method text not null default 'conta';
alter table public.transactions add column if not exists card_id uuid;
alter table public.transactions add column if not exists card_purchase_id uuid;
alter table public.transactions add column if not exists account_id uuid;
alter table public.credit_cards add column if not exists card_type text not null default 'credito';
alter table public.credit_cards add column if not exists account_id uuid;
alter table public.credit_cards add column if not exists initial_balance numeric(14,2) not null default 0;
alter table public.credit_cards alter column credit_limit drop not null;
alter table public.credit_cards alter column closing_day drop not null;
alter table public.credit_cards alter column due_day drop not null;
alter table public.credit_cards drop constraint if exists credit_cards_credit_limit_check;
alter table public.credit_cards add constraint credit_cards_credit_limit_check check (card_type <> 'credito' or (credit_limit is not null and credit_limit >= 0));

-- Existing cards are credit cards.
update public.credit_cards set card_type = 'credito' where card_type is null;

alter table public.transactions drop constraint if exists transactions_payment_method_check;
alter table public.transactions add constraint transactions_payment_method_check check (payment_method in ('conta','cartao','debito','beneficio'));
alter table public.credit_cards drop constraint if exists credit_cards_card_type_check;
alter table public.credit_cards add constraint credit_cards_card_type_check check (card_type in ('credito','debito','alimentacao','refeicao','beneficio'));

create index if not exists accounts_user_idx on public.accounts(user_id);
create index if not exists transactions_user_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_card_idx on public.transactions(card_id);
create index if not exists transactions_account_idx on public.transactions(account_id);
create index if not exists investments_user_asset_idx on public.investments(user_id, asset);
create index if not exists credit_cards_user_idx on public.credit_cards(user_id);
create index if not exists card_purchases_user_date_idx on public.card_purchases(user_id, purchase_date desc);
create index if not exists card_purchases_card_idx on public.card_purchases(card_id);
create index if not exists card_invoices_card_month_idx on public.card_invoices(card_id, reference_month);

alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.investments enable row level security;
alter table public.credit_cards enable row level security;
alter table public.card_purchases enable row level security;
alter table public.card_invoices enable row level security;

-- Policies
DO $$ DECLARE t text; BEGIN
  FOR t IN SELECT unnest(ARRAY['accounts','transactions','investments','credit_cards','card_purchases','card_invoices']) LOOP
    EXECUTE format('drop policy if exists "Users can view own %s" on public.%I', t, t);
    EXECUTE format('drop policy if exists "Users can insert own %s" on public.%I', t, t);
    EXECUTE format('drop policy if exists "Users can update own %s" on public.%I', t, t);
    EXECUTE format('drop policy if exists "Users can delete own %s" on public.%I', t, t);
    EXECUTE format('create policy "Users can view own %s" on public.%I for select using (auth.uid() = user_id)', t, t);
    EXECUTE format('create policy "Users can insert own %s" on public.%I for insert with check (auth.uid() = user_id)', t, t);
    EXECUTE format('create policy "Users can update own %s" on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t, t);
    EXECUTE format('create policy "Users can delete own %s" on public.%I for delete using (auth.uid() = user_id)', t, t);
  END LOOP;
END $$;
