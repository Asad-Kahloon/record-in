-- =============================================================================
--  EXPENSE TRACKER · Supabase schema  (v3 — multi-currency, borrow & lend, budgets)
--  Paste this whole file into Supabase → SQL Editor → Run.
--
--  Safe to run again at any time. On an existing database it upgrades in place:
--  new columns and tables are added, existing rows are backfilled, data is kept.
--
--  Data model
--    auth.users ──(trigger)──▶ public.users        role + main currency
--    public.incomes           monthly income entries
--    public.expenses          daily expenses
--    public.debts             money you borrowed or lent, pending or settled
--    public.budgets           monthly spending limits (overall + per category)
--    public.categories        fixed expense categories
--    public.notifications     activity feed delivered to the super admin
--
--  Money
--    Every entry keeps exactly what was typed (amount + currency) and its value
--    in the owner's main currency (base_amount = amount × rate). Reports always
--    sum base_amount. The app server supplies exchange rates; the database
--    validates them and does the arithmetic. Changing your main currency
--    re-expresses every entry with fresh rates — original amounts never change.
--
--  Security model
--    • RLS is enabled on every table. Signed-in users may only SELECT rows they
--      own (the super admin may read everything). The anon role gets nothing.
--    • There are NO insert/update/delete grants. Every write goes through the
--      RPC functions below, which check sign-in, account status, ownership,
--      input and the edit window.
--    • Triggers enforce the edit window and immutable columns again at table
--      level. Marking a debt as settled is the one change allowed after the
--      window closes.
--    • The very first account becomes superadmin. Everyone after that is user.
--    • Helpers live in the `private` schema, which the Data API never exposes.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Schemas & types
-- -----------------------------------------------------------------------------

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

do $$
begin
  create type public.app_role as enum ('superadmin', 'user');
exception
  when duplicate_object then null;
end $$;


-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null default '',
  full_name   text not null default '',
  avatar_url  text,
  role        public.app_role not null default 'user',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint users_full_name_len check (char_length(full_name) <= 80),
  constraint users_avatar_url_len check (avatar_url is null or char_length(avatar_url) <= 1000)
);

-- Main currency. NULL until the user picks one on first sign-in.
alter table public.users add column if not exists currency text;

-- When the welcome tour was finished. NULL shows the tour on next sign-in.
alter table public.users add column if not exists onboarded_at timestamptz;

create index if not exists users_role_idx on public.users (role);

create table if not exists public.categories (
  slug        text primary key,
  name        text not null,
  sort_order  smallint not null default 0,
  is_active   boolean not null default true
);

create table if not exists public.incomes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  month           date not null,
  amount          numeric(12, 2) not null,
  currency        text not null,
  rate            numeric(18, 8) not null default 1,
  base_amount     numeric(14, 2) not null,
  source          text not null,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  editable_until  timestamptz not null default (now() + interval '30 minutes'),
  constraint incomes_month_is_first_day check (extract(day from month) = 1),
  constraint incomes_amount_range check (amount > 0 and amount <= 999999999.99),
  constraint incomes_source_len check (char_length(source) between 1 and 60),
  constraint incomes_note_len check (note is null or char_length(note) <= 200)
);

create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  category        text not null references public.categories (slug) on update cascade,
  amount          numeric(12, 2) not null,
  currency        text not null,
  rate            numeric(18, 8) not null default 1,
  base_amount     numeric(14, 2) not null,
  description     text not null,
  spent_on        date not null,
  payment_method  text not null default 'cash',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  editable_until  timestamptz not null default (now() + interval '30 minutes'),
  constraint expenses_amount_range check (amount > 0 and amount <= 999999999.99),
  constraint expenses_description_len check (char_length(description) between 1 and 120),
  constraint expenses_payment_method_valid check (payment_method in ('cash', 'card', 'bank', 'wallet', 'other')),
  constraint expenses_spent_on_min check (spent_on >= date '2020-01-01')
);

-- Money you borrowed (you owe) or lent (you are owed). settled_on NULL = pending.
create table if not exists public.debts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users (id) on delete cascade,
  direction       text not null,
  counterparty    text not null,
  amount          numeric(12, 2) not null,
  currency        text not null,
  rate            numeric(18, 8) not null default 1,
  base_amount     numeric(14, 2) not null,
  note            text,
  occurred_on     date not null,
  due_on          date,
  settled_on      date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  editable_until  timestamptz not null default (now() + interval '30 minutes'),
  constraint debts_direction_valid check (direction in ('borrowed', 'lent')),
  constraint debts_counterparty_len check (char_length(counterparty) between 1 and 80),
  constraint debts_amount_range check (amount > 0 and amount <= 999999999.99),
  constraint debts_note_len check (note is null or char_length(note) <= 200),
  constraint debts_occurred_on_min check (occurred_on >= date '2020-01-01'),
  constraint debts_due_after_start check (due_on is null or due_on >= occurred_on),
  constraint debts_settled_after_start check (settled_on is null or settled_on >= occurred_on)
);

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.users (id) on delete cascade,
  actor_id      uuid references public.users (id) on delete set null,
  type          text not null,
  payload       jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);


-- -----------------------------------------------------------------------------
-- 1b. Upgrades for databases created with v1 (no-ops on a fresh install)
-- -----------------------------------------------------------------------------

-- Currency columns on incomes and expenses. v1 entries were recorded in the
-- app's single currency (PKR), so they are backfilled as PKR at rate 1.
alter table public.incomes  add column if not exists currency text;
alter table public.incomes  add column if not exists rate numeric(18, 8);
alter table public.incomes  add column if not exists base_amount numeric(14, 2);
alter table public.expenses add column if not exists currency text;
alter table public.expenses add column if not exists rate numeric(18, 8);
alter table public.expenses add column if not exists base_amount numeric(14, 2);

update public.incomes
   set currency = coalesce(currency, 'PKR'),
       rate = coalesce(rate, 1),
       base_amount = coalesce(base_amount, amount)
 where currency is null or rate is null or base_amount is null;

update public.expenses
   set currency = coalesce(currency, 'PKR'),
       rate = coalesce(rate, 1),
       base_amount = coalesce(base_amount, amount)
 where currency is null or rate is null or base_amount is null;

alter table public.incomes
  alter column currency set not null,
  alter column rate set not null,
  alter column rate set default 1,
  alter column base_amount set not null;

alter table public.expenses
  alter column currency set not null,
  alter column rate set not null,
  alter column rate set default 1,
  alter column base_amount set not null;

-- Constraints are added by name so re-running never duplicates them.
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('users',    'users_currency_format',      $c$check (currency is null or currency ~ '^[A-Z]{3}$')$c$),
      ('incomes',  'incomes_currency_format',    $c$check (currency ~ '^[A-Z]{3}$')$c$),
      ('incomes',  'incomes_rate_positive',      $c$check (rate > 0)$c$),
      ('incomes',  'incomes_base_amount_range',  $c$check (base_amount >= 0 and base_amount <= 999999999999.99)$c$),
      ('expenses', 'expenses_currency_format',   $c$check (currency ~ '^[A-Z]{3}$')$c$),
      ('expenses', 'expenses_rate_positive',     $c$check (rate > 0)$c$),
      ('expenses', 'expenses_base_amount_range', $c$check (base_amount >= 0 and base_amount <= 999999999999.99)$c$),
      ('debts',    'debts_currency_format',      $c$check (currency ~ '^[A-Z]{3}$')$c$),
      ('debts',    'debts_rate_positive',        $c$check (rate > 0)$c$),
      ('debts',    'debts_base_amount_range',    $c$check (base_amount >= 0 and base_amount <= 999999999999.99)$c$)
    ) as t(tbl, name, def)
  loop
    if not exists (
      select 1 from pg_constraint
      where conname = c.name and conrelid = format('public.%I', c.tbl)::regclass
    ) then
      execute format('alter table public.%I add constraint %I %s', c.tbl, c.name, c.def);
    end if;
  end loop;
end $$;

alter table public.notifications drop constraint if exists notifications_type_valid;
alter table public.notifications add constraint notifications_type_valid check (type in (
  'expense_added', 'expense_updated', 'expense_deleted',
  'income_added', 'income_updated', 'income_deleted',
  'debt_added', 'debt_updated', 'debt_deleted', 'debt_settled', 'debt_reopened',
  'user_joined'
));

create index if not exists incomes_user_month_idx on public.incomes (user_id, month);
create index if not exists incomes_user_created_idx on public.incomes (user_id, created_at desc);
create index if not exists expenses_user_spent_idx on public.expenses (user_id, spent_on desc, created_at desc);
create index if not exists expenses_user_created_idx on public.expenses (user_id, created_at desc);
create index if not exists expenses_category_idx on public.expenses (category);
create index if not exists debts_user_idx on public.debts (user_id, occurred_on desc);
create index if not exists debts_user_created_idx on public.debts (user_id, created_at desc);
create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (recipient_id) where read_at is null;


-- -----------------------------------------------------------------------------
-- 2. Seed data
-- -----------------------------------------------------------------------------

insert into public.categories (slug, name, sort_order) values
  ('food',          'Food & Dining',     10),
  ('groceries',     'Groceries',         20),
  ('transport',     'Transport',         30),
  ('fuel',          'Fuel',              40),
  ('bills',         'Bills & Utilities', 50),
  ('rent',          'Rent & Housing',    60),
  ('mobile',        'Mobile & Internet', 70),
  ('shopping',      'Shopping',          80),
  ('health',        'Health & Medical',  90),
  ('education',     'Education',        100),
  ('entertainment', 'Entertainment',    110),
  ('travel',        'Travel',           120),
  ('family',        'Family & Kids',    130),
  ('personal',      'Personal Care',    140),
  ('subscriptions', 'Subscriptions',    150),
  ('gifts',         'Gifts & Charity',  160),
  ('other',         'Other',            999)
on conflict (slug) do update
  set name = excluded.name,
      sort_order = excluded.sort_order;

-- -----------------------------------------------------------------------------
-- 3. Private helpers (not reachable through the API)
-- -----------------------------------------------------------------------------

-- How long an entry stays editable after it is added. Change it here only.
create or replace function private.edit_window()
returns interval
language sql immutable
set search_path = ''
as $$ select interval '30 minutes' $$;

create or replace function private.edit_window_minutes()
returns integer
language sql immutable
set search_path = ''
as $$ select (extract(epoch from private.edit_window()) / 60)::integer $$;

create or replace function private.month_start(p_date date)
returns date
language sql immutable
set search_path = ''
as $$ select date_trunc('month', p_date::timestamp)::date $$;

create or replace function private.utc_today()
returns date
language sql stable
set search_path = ''
as $$ select (now() at time zone 'utc')::date $$;

-- Used by RLS policies. SECURITY DEFINER so it can read public.users without
-- recursing into the users table's own policy.
create or replace function private.is_superadmin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'superadmin'
      and u.is_active
  );
$$;

-- Returns the signed-in, active user or raises.
create or replace function private.require_user()
returns public.users
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user public.users;
begin
  if auth.uid() is null then
    raise exception 'You need to sign in first.' using errcode = '28000';
  end if;

  select * into v_user from public.users u where u.id = auth.uid();

  if v_user.id is null then
    raise exception 'Your profile was not found. Please sign in again.' using errcode = '28000';
  end if;

  if not v_user.is_active then
    raise exception 'Your account has been deactivated. Please contact the admin.' using errcode = '42501';
  end if;

  return v_user;
end;
$$;

-- Decides whose data a read is allowed to target.
--   • no user id / own id → yourself
--   • another user's id   → only the super admin
create or replace function private.resolve_target(p_viewer public.users, p_user_id uuid)
returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_user_id = p_viewer.id then
    return p_viewer.id;
  end if;

  if p_viewer.role <> 'superadmin' then
    raise exception 'You do not have access to this account.' using errcode = '42501';
  end if;

  if not exists (select 1 from public.users u where u.id = p_user_id) then
    raise exception 'Account not found.' using errcode = 'P0002';
  end if;

  return p_user_id;
end;
$$;

-- Checks an entry's currency and returns the rate into the owner's main
-- currency (always exactly 1 when they match).
create or replace function private.resolve_rate(p_user public.users, p_currency text, p_rate numeric)
returns numeric
language plpgsql stable
set search_path = ''
as $$
declare
  v_rate numeric;
begin
  if p_user.currency is null then
    raise exception 'Choose your main currency in your profile first.';
  end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'Please choose a valid currency.';
  end if;
  if p_currency = p_user.currency then
    return 1;
  end if;
  v_rate := round(p_rate, 8);
  if v_rate is null or v_rate <= 0 or v_rate > 1000000000 then
    raise exception 'Could not convert this amount to %. Please try again.', p_user.currency;
  end if;
  return v_rate;
end;
$$;

-- Amount × rate, rounded to cents, in the owner's main currency.
create or replace function private.converted(p_amount numeric, p_rate numeric)
returns numeric
language plpgsql immutable
set search_path = ''
as $$
declare
  v_value numeric := round(round(p_amount, 2) * p_rate, 2);
begin
  if v_value > 999999999999.99 then
    raise exception 'That amount is too large after currency conversion.';
  end if;
  return v_value;
end;
$$;

-- Money actually available to spend, across all months:
--   income − spending + money borrowed and still held − money lent out.
-- A settled debt cancels itself out on both sides, so it drops out of the sum.
create or replace function private.available_balance(p_user_id uuid)
returns numeric
language sql stable security definer
set search_path = ''
as $$
  select
    coalesce((select sum(i.base_amount) from public.incomes i where i.user_id = p_user_id), 0)
    - coalesce((select sum(e.base_amount) from public.expenses e where e.user_id = p_user_id), 0)
    + coalesce((select sum(d.base_amount) from public.debts d
                where d.user_id = p_user_id and d.direction = 'borrowed' and d.settled_on is null), 0)
    - coalesce((select sum(d.base_amount) from public.debts d
                where d.user_id = p_user_id and d.direction = 'lent' and d.settled_on is null), 0);
$$;

-- The same balance as it stood before a date — what was carried into a month.
create or replace function private.balance_before(p_user_id uuid, p_date date)
returns numeric
language sql stable security definer
set search_path = ''
as $$
  select
    coalesce((select sum(i.base_amount) from public.incomes i
              where i.user_id = p_user_id and i.month < p_date), 0)
    - coalesce((select sum(e.base_amount) from public.expenses e
                where e.user_id = p_user_id and e.spent_on < p_date), 0)
    + coalesce((select sum(d.base_amount) from public.debts d
                where d.user_id = p_user_id and d.direction = 'borrowed' and d.occurred_on < p_date), 0)
    - coalesce((select sum(d.base_amount) from public.debts d
                where d.user_id = p_user_id and d.direction = 'borrowed' and d.settled_on < p_date), 0)
    - coalesce((select sum(d.base_amount) from public.debts d
                where d.user_id = p_user_id and d.direction = 'lent' and d.occurred_on < p_date), 0)
    + coalesce((select sum(d.base_amount) from public.debts d
                where d.user_id = p_user_id and d.direction = 'lent' and d.settled_on < p_date), 0);
$$;

-- Every penny is recorded, so money can only go out if it is actually there.
-- p_credit adds back the amount of an entry that is being replaced or removed.
create or replace function private.assert_can_spend(p_user public.users, p_amount numeric, p_credit numeric default 0)
returns void
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_available numeric := private.available_balance(p_user.id) + coalesce(p_credit, 0);
begin
  if p_amount > v_available then
    raise exception 'That is more than the % you have available. Record the money coming in first.',
      coalesce(p_user.currency, '') || ' ' || to_char(greatest(v_available, 0), 'FM999999999990.00');
  end if;
end;
$$;

create or replace function private.validate_expense(
  p_amount numeric,
  p_category text,
  p_description text,
  p_spent_on date,
  p_payment_method text
)
returns void
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;
  if p_amount > 999999999.99 then
    raise exception 'That amount is too large.';
  end if;
  if p_description is null or char_length(btrim(p_description)) < 1 then
    raise exception 'Please add a short description.';
  end if;
  if char_length(btrim(p_description)) > 120 then
    raise exception 'Description must be 120 characters or fewer.';
  end if;
  if p_category is null
     or not exists (select 1 from public.categories c where c.slug = p_category and c.is_active) then
    raise exception 'Please choose a valid category.';
  end if;
  if p_payment_method is null
     or p_payment_method not in ('cash', 'card', 'bank', 'wallet', 'other') then
    raise exception 'Please choose a valid payment method.';
  end if;
  if p_spent_on is null then
    raise exception 'Please choose the date of the expense.';
  end if;
  -- +1 day of slack so users ahead of UTC can log "today".
  if p_spent_on > private.utc_today() + 1 then
    raise exception 'Expense date cannot be in the future.';
  end if;
  if p_spent_on < date '2020-01-01' then
    raise exception 'Expense date is too far in the past.';
  end if;
end;
$$;

create or replace function private.validate_income(p_month date, p_amount numeric, p_source text, p_note text)
returns void
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if p_month is null then
    raise exception 'Please choose a month.';
  end if;
  if private.month_start(p_month) < date '2020-01-01' then
    raise exception 'That month is too far in the past.';
  end if;
  if private.month_start(p_month) > (private.month_start(private.utc_today()) + interval '1 month')::date then
    raise exception 'Income can be added at most one month ahead.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;
  if p_amount > 999999999.99 then
    raise exception 'That amount is too large.';
  end if;
  if p_source is null or char_length(btrim(p_source)) < 1 then
    raise exception 'Please add where this income came from (e.g. Salary).';
  end if;
  if char_length(btrim(p_source)) > 60 then
    raise exception 'Source must be 60 characters or fewer.';
  end if;
  if p_note is not null and char_length(btrim(p_note)) > 200 then
    raise exception 'Note must be 200 characters or fewer.';
  end if;
end;
$$;

create or replace function private.validate_debt(
  p_direction text,
  p_counterparty text,
  p_amount numeric,
  p_occurred_on date,
  p_due_on date,
  p_note text
)
returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if p_direction is null or p_direction not in ('borrowed', 'lent') then
    raise exception 'Choose whether you borrowed or lent this money.';
  end if;
  if p_counterparty is null or char_length(btrim(p_counterparty)) < 1 then
    raise exception 'Who is this with? Add a name.';
  end if;
  if char_length(btrim(p_counterparty)) > 80 then
    raise exception 'Name must be 80 characters or fewer.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be greater than zero.';
  end if;
  if p_amount > 999999999.99 then
    raise exception 'That amount is too large.';
  end if;
  if p_occurred_on is null then
    raise exception 'Please choose the date.';
  end if;
  if p_occurred_on > private.utc_today() + 1 then
    raise exception 'The date cannot be in the future.';
  end if;
  if p_occurred_on < date '2020-01-01' then
    raise exception 'That date is too far in the past.';
  end if;
  if p_due_on is not null and p_due_on < p_occurred_on then
    raise exception 'The return date cannot be before the loan date.';
  end if;
  if p_note is not null and char_length(btrim(p_note)) > 200 then
    raise exception 'Note must be 200 characters or fewer.';
  end if;
end;
$$;

-- Simple abuse guard: caps how many entries one account can add per hour.
create or replace function private.enforce_rate_limit(p_user_id uuid)
returns void
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_recent integer;
begin
  select
    (select count(*) from public.expenses e where e.user_id = p_user_id and e.created_at > now() - interval '1 hour')
    + (select count(*) from public.incomes i where i.user_id = p_user_id and i.created_at > now() - interval '1 hour')
    + (select count(*) from public.debts d where d.user_id = p_user_id and d.created_at > now() - interval '1 hour')
  into v_recent;

  if v_recent >= 150 then
    raise exception 'Too many entries in a short time. Please wait a little and try again.';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Triggers
-- -----------------------------------------------------------------------------

-- 4a. New sign-up → public.users row. First account ever = superadmin.
--     Lives in `public` (as Supabase recommends for auth triggers) but is not
--     callable through the API (execute is revoked at the bottom).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_name text;
begin
  -- Serialize sign-ups so two simultaneous "first" sign-ups can't both win.
  perform pg_advisory_xact_lock(hashtext('expense_tracker.first_superadmin'));

  if exists (select 1 from public.users u where u.role = 'superadmin') then
    v_role := 'user';
  else
    v_role := 'superadmin';
  end if;

  -- Role is NEVER read from user-supplied metadata.
  v_name := left(btrim(coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(new.email, ''), '@', 1)
  )), 80);

  insert into public.users (id, email, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.email, ''),
    v_name,
    left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), 1000),
    v_role
  )
  on conflict (id) do nothing;

  if v_role = 'user' then
    insert into public.notifications (recipient_id, actor_id, type, payload)
    select u.id, new.id, 'user_joined', jsonb_build_object('actor_name', v_name, 'email', new.email)
    from public.users u
    where u.role = 'superadmin' and u.is_active;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 4b. Keep email / avatar in sync when the auth record changes.
create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_avatar text := left(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'), 1000);
begin
  update public.users u
     set email = coalesce(new.email, u.email),
         avatar_url = coalesce(v_avatar, u.avatar_url)
   where u.id = new.id
     and (u.email is distinct from coalesce(new.email, u.email)
          or u.avatar_url is distinct from coalesce(v_avatar, u.avatar_url));
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_auth_user_updated();

-- 4c. Protect account columns. Requests from the app carry a JWT
--     (auth.uid() is set); the SQL editor and the auth service do not.
create or replace function private.tg_users_guard()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.created_at is distinct from old.created_at then
      raise exception 'These account fields cannot be changed.' using errcode = '42501';
    end if;

    if new.is_active is distinct from old.is_active and not private.is_superadmin() then
      raise exception 'Only the super admin can change account status.' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists users_guard on public.users;
create trigger users_guard
  before update on public.users
  for each row execute function private.tg_users_guard();

-- 4d. Edit window + immutable columns for expenses, incomes and debts.
create or replace function private.tg_entry_guard()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_noun text := case tg_table_name when 'expenses' then 'expense' when 'incomes' then 'income entry' else 'debt' end;
begin
  if tg_op = 'INSERT' then
    -- The server clock decides when the window closes, never the client.
    new.created_at := now();
    new.updated_at := now();
    new.editable_until := now() + private.edit_window();
    return new;
  end if;

  -- App requests carry a JWT (auth.uid() is set); SQL-editor maintenance does not.
  if auth.uid() is not null and old.user_id is distinct from auth.uid() then
    raise exception 'You can only change your own entries.' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    -- Switching main currency may only re-express converted amounts.
    if current_setting('expense_tracker.recalculating', true) = 'on' then
      if (to_jsonb(new) - 'rate' - 'base_amount') is distinct from (to_jsonb(old) - 'rate' - 'base_amount') then
        raise exception 'Only converted amounts can change while switching currency.';
      end if;
      return new;
    end if;

    -- Marking a debt as settled (or pending again) is allowed at any time.
    if tg_table_name = 'debts'
       and (to_jsonb(new) - 'settled_on' - 'updated_at') is not distinct from (to_jsonb(old) - 'settled_on' - 'updated_at') then
      new.updated_at := now();
      return new;
    end if;
  end if;

  if auth.uid() is not null and now() > old.editable_until then
    raise exception 'This % is locked. Entries can only be edited or deleted within % minutes of adding them.',
      v_noun, private.edit_window_minutes();
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  new.id := old.id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.editable_until := old.editable_until;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists expenses_guard on public.expenses;
create trigger expenses_guard
  before insert or update or delete on public.expenses
  for each row execute function private.tg_entry_guard();

drop trigger if exists incomes_guard on public.incomes;
create trigger incomes_guard
  before insert or update or delete on public.incomes
  for each row execute function private.tg_entry_guard();

drop trigger if exists debts_guard on public.debts;
create trigger debts_guard
  before insert or update or delete on public.debts
  for each row execute function private.tg_entry_guard();

-- 4e. Tell the super admin(s) whenever someone adds, edits, settles or deletes.
create or replace function private.tg_notify_admins()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_rec     jsonb;
  v_actor   uuid;
  v_kind    text := case tg_table_name when 'expenses' then 'expense' when 'incomes' then 'income' else 'debt' end;
  v_action  text := case tg_op when 'INSERT' then 'added' when 'UPDATE' then 'updated' else 'deleted' end;
  v_name    text;
  v_payload jsonb;
begin
  -- Only activity from the app. Maintenance, cascades and currency switches stay silent.
  if auth.uid() is null or current_setting('expense_tracker.recalculating', true) = 'on' then
    return null;
  end if;

  if tg_op = 'DELETE' then
    v_rec := to_jsonb(old);
  else
    v_rec := to_jsonb(new);
  end if;

  if tg_table_name = 'debts' and tg_op = 'UPDATE' then
    if (to_jsonb(old) ->> 'settled_on') is null and (v_rec ->> 'settled_on') is not null then
      v_action := 'settled';
    elsif (to_jsonb(old) ->> 'settled_on') is not null and (v_rec ->> 'settled_on') is null then
      v_action := 'reopened';
    end if;
  end if;

  v_actor := (v_rec ->> 'user_id')::uuid;

  select coalesce(nullif(u.full_name, ''), u.email) into v_name
  from public.users u
  where u.id = v_actor;

  v_payload := jsonb_build_object(
    'record_id',  v_rec ->> 'id',
    'actor_name', v_name,
    'amount',     (v_rec ->> 'amount')::numeric,
    'currency',   v_rec ->> 'currency',
    'label',      coalesce(v_rec ->> 'description', v_rec ->> 'source', v_rec ->> 'counterparty'),
    'category',   v_rec ->> 'category',
    'direction',  v_rec ->> 'direction',
    'date',       coalesce(v_rec ->> 'spent_on', v_rec ->> 'month', v_rec ->> 'occurred_on')
  );

  if tg_op = 'UPDATE' and v_action = 'updated' then
    v_payload := v_payload || jsonb_build_object('previous_amount', (to_jsonb(old) ->> 'amount')::numeric);
  end if;

  insert into public.notifications (recipient_id, actor_id, type, payload)
  select u.id, v_actor, v_kind || '_' || v_action, v_payload
  from public.users u
  where u.role = 'superadmin'
    and u.is_active
    and u.id <> v_actor;

  return null;
end;
$$;

drop trigger if exists expenses_notify on public.expenses;
create trigger expenses_notify
  after insert or update or delete on public.expenses
  for each row execute function private.tg_notify_admins();

drop trigger if exists incomes_notify on public.incomes;
create trigger incomes_notify
  after insert or update or delete on public.incomes
  for each row execute function private.tg_notify_admins();

drop trigger if exists debts_notify on public.debts;
create trigger debts_notify
  after insert or update or delete on public.debts
  for each row execute function private.tg_notify_admins();

-- -----------------------------------------------------------------------------
-- 5. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.users         enable row level security;
alter table public.categories    enable row level security;
alter table public.incomes       enable row level security;
alter table public.expenses      enable row level security;
alter table public.debts         enable row level security;
alter table public.notifications enable row level security;

-- users
drop policy if exists "users: read own, superadmin reads all" on public.users;
create policy "users: read own, superadmin reads all"
  on public.users for select to authenticated
  using (id = (select auth.uid()) or (select private.is_superadmin()));

-- categories
drop policy if exists "categories: signed-in users can read" on public.categories;
create policy "categories: signed-in users can read"
  on public.categories for select to authenticated
  using (true);

-- expenses
drop policy if exists "expenses: read own, superadmin reads all" on public.expenses;
create policy "expenses: read own, superadmin reads all"
  on public.expenses for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_superadmin()));

drop policy if exists "expenses: insert own" on public.expenses;
create policy "expenses: insert own"
  on public.expenses for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "expenses: update own while editable" on public.expenses;
create policy "expenses: update own while editable"
  on public.expenses for update to authenticated
  using (user_id = (select auth.uid()) and now() <= editable_until)
  with check (user_id = (select auth.uid()));

drop policy if exists "expenses: delete own while editable" on public.expenses;
create policy "expenses: delete own while editable"
  on public.expenses for delete to authenticated
  using (user_id = (select auth.uid()) and now() <= editable_until);

-- incomes
drop policy if exists "incomes: read own, superadmin reads all" on public.incomes;
create policy "incomes: read own, superadmin reads all"
  on public.incomes for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_superadmin()));

drop policy if exists "incomes: insert own" on public.incomes;
create policy "incomes: insert own"
  on public.incomes for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "incomes: update own while editable" on public.incomes;
create policy "incomes: update own while editable"
  on public.incomes for update to authenticated
  using (user_id = (select auth.uid()) and now() <= editable_until)
  with check (user_id = (select auth.uid()));

drop policy if exists "incomes: delete own while editable" on public.incomes;
create policy "incomes: delete own while editable"
  on public.incomes for delete to authenticated
  using (user_id = (select auth.uid()) and now() <= editable_until);

-- debts (settling after the edit window is handled by the RPC + trigger, not direct updates)
drop policy if exists "debts: read own, superadmin reads all" on public.debts;
create policy "debts: read own, superadmin reads all"
  on public.debts for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_superadmin()));

drop policy if exists "debts: insert own" on public.debts;
create policy "debts: insert own"
  on public.debts for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "debts: update own" on public.debts;
create policy "debts: update own"
  on public.debts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "debts: delete own while editable" on public.debts;
create policy "debts: delete own while editable"
  on public.debts for delete to authenticated
  using (user_id = (select auth.uid()) and now() <= editable_until);

-- notifications
drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own"
  on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists "notifications: mark own as read" on public.notifications;
create policy "notifications: mark own as read"
  on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- 6. API (RPC) — profile, main currency & categories
-- -----------------------------------------------------------------------------

create or replace function public.get_my_profile()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user public.users;
begin
  if auth.uid() is null then
    raise exception 'You need to sign in first.' using errcode = '28000';
  end if;

  select * into v_user from public.users u where u.id = auth.uid();

  if v_user.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id',                  v_user.id,
    'email',               v_user.email,
    'full_name',           v_user.full_name,
    'avatar_url',          v_user.avatar_url,
    'role',                v_user.role,
    'is_active',           v_user.is_active,
    'currency',            v_user.currency,
    'onboarded_at',        v_user.onboarded_at,
    'created_at',          v_user.created_at,
    'edit_window_minutes', private.edit_window_minutes()
  );
end;
$$;

create or replace function public.get_my_stats()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user public.users;
begin
  v_user := private.require_user();

  return jsonb_build_object(
    'expense_count',    (select count(*) from public.expenses e where e.user_id = v_user.id),
    'income_count',     (select count(*) from public.incomes i where i.user_id = v_user.id),
    'debt_count',       (select count(*) from public.debts d where d.user_id = v_user.id),
    'expense_total',    (select coalesce(sum(e.base_amount), 0) from public.expenses e where e.user_id = v_user.id),
    'income_total',     (select coalesce(sum(i.base_amount), 0) from public.incomes i where i.user_id = v_user.id),
    'first_expense_on', (select min(e.spent_on) from public.expenses e where e.user_id = v_user.id)
  );
end;
$$;

create or replace function public.update_my_profile(p_full_name text)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_name text := btrim(coalesce(p_full_name, ''));
begin
  v_user := private.require_user();

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Name must be between 2 and 80 characters.';
  end if;

  update public.users u set full_name = v_name where u.id = v_user.id;

  return public.get_my_profile();
end;
$$;

create or replace function public.list_categories()
returns table (slug text, name text)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform private.require_user();

  return query
    select c.slug, c.name
    from public.categories c
    where c.is_active
    order by c.sort_order, c.name;
end;
$$;

-- Sets (or changes) the main currency. p_rates maps currency codes to the value
-- of 1 unit in the new main currency, e.g. {"USD": 279.4, "EUR": 302.1}.
-- Every entry is re-expressed with those rates; what was typed never changes.
create or replace function public.set_my_currency(p_currency text, p_rates jsonb default '{}'::jsonb)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user    public.users;
  v_rates   jsonb := coalesce(p_rates, '{}'::jsonb);
  v_missing text;
begin
  v_user := private.require_user();

  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'Please choose a valid currency.';
  end if;

  perform pg_advisory_xact_lock(hashtext('expense_tracker.write:' || v_user.id::text));

  select string_agg(distinct c.currency, ', ') into v_missing
  from (
    select e.currency from public.expenses e where e.user_id = v_user.id
    union
    select i.currency from public.incomes i where i.user_id = v_user.id
    union
    select d.currency from public.debts d where d.user_id = v_user.id
  ) c
  where c.currency <> p_currency
    and coalesce((v_rates ->> c.currency)::numeric, 0) <= 0;

  if v_missing is not null then
    raise exception 'Could not get exchange rates for %. Please try again.', v_missing;
  end if;

  -- Budgets are stored in the old main currency and need its rate too.
  if v_user.currency is not null and v_user.currency <> p_currency
     and exists (select 1 from public.budgets b where b.user_id = v_user.id)
     and coalesce((v_rates ->> v_user.currency)::numeric, 0) <= 0 then
    raise exception 'Could not get exchange rates for %. Please try again.', v_user.currency;
  end if;

  update public.users u set currency = p_currency where u.id = v_user.id;

  -- Lets the entry guard accept rate/base_amount changes on locked rows, and
  -- keeps the admin feed quiet. Scoped to this transaction only.
  perform set_config('expense_tracker.recalculating', 'on', true);

  update public.expenses e
     set rate = case when e.currency = p_currency then 1 else round((v_rates ->> e.currency)::numeric, 8) end,
         base_amount = private.converted(
           e.amount,
           case when e.currency = p_currency then 1 else round((v_rates ->> e.currency)::numeric, 8) end)
   where e.user_id = v_user.id;

  update public.incomes i
     set rate = case when i.currency = p_currency then 1 else round((v_rates ->> i.currency)::numeric, 8) end,
         base_amount = private.converted(
           i.amount,
           case when i.currency = p_currency then 1 else round((v_rates ->> i.currency)::numeric, 8) end)
   where i.user_id = v_user.id;

  update public.debts d
     set rate = case when d.currency = p_currency then 1 else round((v_rates ->> d.currency)::numeric, 8) end,
         base_amount = private.converted(
           d.amount,
           case when d.currency = p_currency then 1 else round((v_rates ->> d.currency)::numeric, 8) end)
   where d.user_id = v_user.id;

  if v_user.currency is not null and v_user.currency <> p_currency then
    update public.budgets b
       set amount = greatest(private.converted(b.amount, round((v_rates ->> v_user.currency)::numeric, 8)), 0.01),
           updated_at = now()
     where b.user_id = v_user.id;
  end if;

  perform set_config('expense_tracker.recalculating', 'off', true);

  return public.get_my_profile();
end;
$$;

-- -----------------------------------------------------------------------------
-- 7. API (RPC) — expenses
-- -----------------------------------------------------------------------------

-- v1 signatures (without currency) are replaced.
drop function if exists public.add_expense(numeric, text, text, date, text);
drop function if exists public.update_expense(uuid, numeric, text, text, date, text);

create or replace function public.add_expense(
  p_amount numeric,
  p_category text,
  p_description text,
  p_spent_on date,
  p_payment_method text,
  p_currency text,
  p_rate numeric default 1
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_rate numeric;
  v_row  public.expenses;
begin
  v_user := private.require_user();
  perform private.validate_expense(p_amount, p_category, p_description, p_spent_on, p_payment_method);
  v_rate := private.resolve_rate(v_user, p_currency, p_rate);

  -- One write at a time per account (stops double-taps creating duplicates).
  perform pg_advisory_xact_lock(hashtext('expense_tracker.write:' || v_user.id::text));
  perform private.enforce_rate_limit(v_user.id);

  if exists (
    select 1 from public.expenses e
    where e.user_id = v_user.id
      and e.amount = round(p_amount, 2)
      and e.currency = p_currency
      and e.category = p_category
      and e.description = btrim(p_description)
      and e.spent_on = p_spent_on
      and e.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'This exact expense was added a moment ago, so the duplicate was skipped.';
  end if;

  perform private.assert_can_spend(v_user, private.converted(p_amount, v_rate));

  insert into public.expenses (user_id, category, amount, currency, rate, base_amount, description, spent_on, payment_method)
  values (
    v_user.id, p_category, round(p_amount, 2), p_currency, v_rate,
    private.converted(p_amount, v_rate), btrim(p_description), p_spent_on, p_payment_method
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.update_expense(
  p_id uuid,
  p_amount numeric,
  p_category text,
  p_description text,
  p_spent_on date,
  p_payment_method text,
  p_currency text,
  p_rate numeric default 1
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_row  public.expenses;
  v_rate numeric;
begin
  v_user := private.require_user();

  select * into v_row from public.expenses e where e.id = p_id for update;

  -- Someone else's entry looks exactly like a missing one (super admin included).
  if v_row.id is null or v_row.user_id <> v_user.id then
    raise exception 'Expense not found.' using errcode = 'P0002';
  end if;

  if now() > v_row.editable_until then
    raise exception 'This expense is locked. Entries can only be edited within % minutes of adding them.',
      private.edit_window_minutes();
  end if;

  perform private.validate_expense(p_amount, p_category, p_description, p_spent_on, p_payment_method);

  -- Same currency keeps its original rate, so fixing a typo never shifts the conversion.
  if p_currency = v_row.currency then
    v_rate := v_row.rate;
  else
    v_rate := private.resolve_rate(v_user, p_currency, p_rate);
  end if;

  if v_row.amount = round(p_amount, 2)
     and v_row.currency = p_currency
     and v_row.category = p_category
     and v_row.description = btrim(p_description)
     and v_row.spent_on = p_spent_on
     and v_row.payment_method = p_payment_method then
    return to_jsonb(v_row); -- nothing changed, don't ping the admin
  end if;

  -- The old amount goes back into the balance before the new one is checked.
  perform private.assert_can_spend(v_user, private.converted(p_amount, v_rate), v_row.base_amount);

  update public.expenses e
     set amount = round(p_amount, 2),
         currency = p_currency,
         rate = v_rate,
         base_amount = private.converted(p_amount, v_rate),
         category = p_category,
         description = btrim(p_description),
         spent_on = p_spent_on,
         payment_method = p_payment_method
   where e.id = p_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_expense(p_id uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_row  public.expenses;
begin
  v_user := private.require_user();

  select * into v_row from public.expenses e where e.id = p_id for update;

  if v_row.id is null or v_row.user_id <> v_user.id then
    raise exception 'Expense not found.' using errcode = 'P0002';
  end if;

  if now() > v_row.editable_until then
    raise exception 'This expense is locked and can no longer be deleted.';
  end if;

  delete from public.expenses e where e.id = p_id;
end;
$$;

-- Return columns changed in v2, so the old function is dropped first.
drop function if exists public.list_expenses(date, uuid);

create or replace function public.list_expenses(p_month date, p_user_id uuid default null)
returns table (
  id              uuid,
  user_id         uuid,
  category        text,
  category_name   text,
  amount          numeric,
  currency        text,
  rate            numeric,
  base_amount     numeric,
  description     text,
  spent_on        date,
  payment_method  text,
  created_at      timestamptz,
  updated_at      timestamptz,
  editable_until  timestamptz,
  can_edit        boolean
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user   public.users;
  v_target uuid;
  v_from   date := private.month_start(coalesce(p_month, private.utc_today()));
  v_to     date := (private.month_start(coalesce(p_month, private.utc_today())) + interval '1 month')::date;
begin
  v_user := private.require_user();
  v_target := private.resolve_target(v_user, p_user_id);

  return query
    select e.id, e.user_id, e.category, c.name, e.amount, e.currency, e.rate, e.base_amount,
           e.description, e.spent_on, e.payment_method, e.created_at, e.updated_at, e.editable_until,
           (e.user_id = v_user.id and now() <= e.editable_until)
    from public.expenses e
    join public.categories c on c.slug = e.category
    where e.user_id = v_target
      and e.spent_on >= v_from
      and e.spent_on < v_to
    order by e.spent_on desc, e.created_at desc;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. API (RPC) — incomes
-- -----------------------------------------------------------------------------

drop function if exists public.add_income(date, numeric, text, text);
drop function if exists public.update_income(uuid, date, numeric, text, text);

create or replace function public.add_income(
  p_month date,
  p_amount numeric,
  p_source text,
  p_currency text,
  p_note text default null,
  p_rate numeric default 1
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_rate numeric;
  v_row  public.incomes;
begin
  v_user := private.require_user();
  perform private.validate_income(p_month, p_amount, p_source, p_note);
  v_rate := private.resolve_rate(v_user, p_currency, p_rate);

  perform pg_advisory_xact_lock(hashtext('expense_tracker.write:' || v_user.id::text));
  perform private.enforce_rate_limit(v_user.id);

  if exists (
    select 1 from public.incomes i
    where i.user_id = v_user.id
      and i.month = private.month_start(p_month)
      and i.amount = round(p_amount, 2)
      and i.currency = p_currency
      and i.source = btrim(p_source)
      and i.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'This exact income was added a moment ago, so the duplicate was skipped.';
  end if;

  insert into public.incomes (user_id, month, amount, currency, rate, base_amount, source, note)
  values (
    v_user.id,
    private.month_start(p_month),
    round(p_amount, 2),
    p_currency,
    v_rate,
    private.converted(p_amount, v_rate),
    btrim(p_source),
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.update_income(
  p_id uuid,
  p_month date,
  p_amount numeric,
  p_source text,
  p_currency text,
  p_note text default null,
  p_rate numeric default 1
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_row  public.incomes;
  v_rate numeric;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  v_user := private.require_user();

  select * into v_row from public.incomes i where i.id = p_id for update;

  if v_row.id is null or v_row.user_id <> v_user.id then
    raise exception 'Income entry not found.' using errcode = 'P0002';
  end if;

  if now() > v_row.editable_until then
    raise exception 'This income entry is locked. Entries can only be edited within % minutes of adding them.',
      private.edit_window_minutes();
  end if;

  perform private.validate_income(p_month, p_amount, p_source, p_note);

  if p_currency = v_row.currency then
    v_rate := v_row.rate;
  else
    v_rate := private.resolve_rate(v_user, p_currency, p_rate);
  end if;

  if v_row.month = private.month_start(p_month)
     and v_row.amount = round(p_amount, 2)
     and v_row.currency = p_currency
     and v_row.source = btrim(p_source)
     and v_row.note is not distinct from v_note then
    return to_jsonb(v_row);
  end if;

  if private.converted(p_amount, v_rate) < v_row.base_amount then
    perform private.assert_can_spend(v_user, v_row.base_amount - private.converted(p_amount, v_rate));
  end if;

  update public.incomes i
     set month = private.month_start(p_month),
         amount = round(p_amount, 2),
         currency = p_currency,
         rate = v_rate,
         base_amount = private.converted(p_amount, v_rate),
         source = btrim(p_source),
         note = v_note
   where i.id = p_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_income(p_id uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_row  public.incomes;
begin
  v_user := private.require_user();

  select * into v_row from public.incomes i where i.id = p_id for update;

  if v_row.id is null or v_row.user_id <> v_user.id then
    raise exception 'Income entry not found.' using errcode = 'P0002';
  end if;

  if now() > v_row.editable_until then
    raise exception 'This income entry is locked and can no longer be deleted.';
  end if;

  perform private.assert_can_spend(v_user, v_row.base_amount);

  delete from public.incomes i where i.id = p_id;
end;
$$;

drop function if exists public.list_incomes(date, uuid);

create or replace function public.list_incomes(p_month date, p_user_id uuid default null)
returns table (
  id              uuid,
  user_id         uuid,
  month           date,
  amount          numeric,
  currency        text,
  rate            numeric,
  base_amount     numeric,
  source          text,
  note            text,
  created_at      timestamptz,
  updated_at      timestamptz,
  editable_until  timestamptz,
  can_edit        boolean
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user   public.users;
  v_target uuid;
begin
  v_user := private.require_user();
  v_target := private.resolve_target(v_user, p_user_id);

  return query
    select i.id, i.user_id, i.month, i.amount, i.currency, i.rate, i.base_amount, i.source, i.note,
           i.created_at, i.updated_at, i.editable_until,
           (i.user_id = v_user.id and now() <= i.editable_until)
    from public.incomes i
    where i.user_id = v_target
      and i.month = private.month_start(coalesce(p_month, private.utc_today()))
    order by i.created_at desc;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. API (RPC) — borrow & lend
-- -----------------------------------------------------------------------------

create or replace function public.add_debt(
  p_direction text,
  p_counterparty text,
  p_amount numeric,
  p_currency text,
  p_occurred_on date,
  p_due_on date default null,
  p_note text default null,
  p_rate numeric default 1
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_rate numeric;
  v_row  public.debts;
begin
  v_user := private.require_user();
  perform private.validate_debt(p_direction, p_counterparty, p_amount, p_occurred_on, p_due_on, p_note);
  v_rate := private.resolve_rate(v_user, p_currency, p_rate);

  perform pg_advisory_xact_lock(hashtext('expense_tracker.write:' || v_user.id::text));
  perform private.enforce_rate_limit(v_user.id);

  if exists (
    select 1 from public.debts d
    where d.user_id = v_user.id
      and d.direction = p_direction
      and d.counterparty = btrim(p_counterparty)
      and d.amount = round(p_amount, 2)
      and d.currency = p_currency
      and d.occurred_on = p_occurred_on
      and d.created_at > now() - interval '15 seconds'
  ) then
    raise exception 'This exact entry was added a moment ago, so the duplicate was skipped.';
  end if;

  -- Lending is money leaving your hands, so it has to be there.
  if p_direction = 'lent' then
    perform private.assert_can_spend(v_user, private.converted(p_amount, v_rate));
  end if;

  insert into public.debts (user_id, direction, counterparty, amount, currency, rate, base_amount, note, occurred_on, due_on)
  values (
    v_user.id, p_direction, btrim(p_counterparty), round(p_amount, 2), p_currency, v_rate,
    private.converted(p_amount, v_rate), nullif(btrim(coalesce(p_note, '')), ''), p_occurred_on, p_due_on
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.update_debt(
  p_id uuid,
  p_direction text,
  p_counterparty text,
  p_amount numeric,
  p_currency text,
  p_occurred_on date,
  p_due_on date default null,
  p_note text default null,
  p_rate numeric default 1
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_row  public.debts;
  v_rate numeric;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  v_user := private.require_user();

  select * into v_row from public.debts d where d.id = p_id for update;

  if v_row.id is null or v_row.user_id <> v_user.id then
    raise exception 'Entry not found.' using errcode = 'P0002';
  end if;

  if now() > v_row.editable_until then
    raise exception 'This debt is locked. Details can only be edited within % minutes of adding it, but you can still mark it as settled.',
      private.edit_window_minutes();
  end if;

  perform private.validate_debt(p_direction, p_counterparty, p_amount, p_occurred_on, p_due_on, p_note);

  if v_row.settled_on is not null and v_row.settled_on < p_occurred_on then
    raise exception 'This debt was settled before that date.';
  end if;

  if p_currency = v_row.currency then
    v_rate := v_row.rate;
  else
    v_rate := private.resolve_rate(v_user, p_currency, p_rate);
  end if;

  if v_row.direction = p_direction
     and v_row.counterparty = btrim(p_counterparty)
     and v_row.amount = round(p_amount, 2)
     and v_row.currency = p_currency
     and v_row.occurred_on = p_occurred_on
     and v_row.due_on is not distinct from p_due_on
     and v_row.note is not distinct from v_note then
    return to_jsonb(v_row);
  end if;

  if p_direction = 'lent' then
    perform private.assert_can_spend(
      v_user,
      private.converted(p_amount, v_rate),
      case
        when v_row.settled_on is not null then 0
        when v_row.direction = 'lent' then v_row.base_amount
        else -v_row.base_amount
      end);
  end if;

  update public.debts d
     set direction = p_direction,
         counterparty = btrim(p_counterparty),
         amount = round(p_amount, 2),
         currency = p_currency,
         rate = v_rate,
         base_amount = private.converted(p_amount, v_rate),
         occurred_on = p_occurred_on,
         due_on = p_due_on,
         note = v_note
   where d.id = p_id
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_debt(p_id uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_row  public.debts;
begin
  v_user := private.require_user();

  select * into v_row from public.debts d where d.id = p_id for update;

  if v_row.id is null or v_row.user_id <> v_user.id then
    raise exception 'Entry not found.' using errcode = 'P0002';
  end if;

  if now() > v_row.editable_until then
    raise exception 'This debt is locked and can no longer be deleted.';
  end if;

  if v_row.direction = 'borrowed' and v_row.settled_on is null then
    perform private.assert_can_spend(v_user, v_row.base_amount);
  end if;

  delete from public.debts d where d.id = p_id;
end;
$$;

-- Mark a debt as settled (paid back / received) or pending again.
-- Allowed at any time, even after the edit window has closed.
create or replace function public.set_debt_settled(p_id uuid, p_settled boolean, p_settled_on date default null)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_row  public.debts;
  v_date date;
begin
  v_user := private.require_user();

  select * into v_row from public.debts d where d.id = p_id for update;

  if v_row.id is null or v_row.user_id <> v_user.id then
    raise exception 'Entry not found.' using errcode = 'P0002';
  end if;

  if coalesce(p_settled, true) then
    v_date := coalesce(p_settled_on, private.utc_today());
    if v_date < v_row.occurred_on then
      raise exception 'The settle date cannot be before the loan date.';
    end if;
    if v_date > private.utc_today() + 1 then
      raise exception 'The settle date cannot be in the future.';
    end if;
    if v_row.settled_on is not distinct from v_date then
      return to_jsonb(v_row);
    end if;
    if v_row.direction = 'borrowed' then
      perform private.assert_can_spend(v_user, v_row.base_amount);
    end if;
    update public.debts d set settled_on = v_date where d.id = p_id returning * into v_row;
  else
    if v_row.settled_on is null then
      return to_jsonb(v_row);
    end if;
    if v_row.direction = 'lent' then
      perform private.assert_can_spend(v_user, v_row.base_amount);
    end if;
    update public.debts d set settled_on = null where d.id = p_id returning * into v_row;
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.list_debts(p_user_id uuid default null)
returns table (
  id              uuid,
  user_id         uuid,
  direction       text,
  counterparty    text,
  amount          numeric,
  currency        text,
  rate            numeric,
  base_amount     numeric,
  note            text,
  occurred_on     date,
  due_on          date,
  settled_on      date,
  created_at      timestamptz,
  updated_at      timestamptz,
  editable_until  timestamptz,
  can_edit        boolean,
  is_owner        boolean
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user   public.users;
  v_target uuid;
begin
  v_user := private.require_user();
  v_target := private.resolve_target(v_user, p_user_id);

  return query
    select d.id, d.user_id, d.direction, d.counterparty, d.amount, d.currency, d.rate, d.base_amount,
           d.note, d.occurred_on, d.due_on, d.settled_on, d.created_at, d.updated_at, d.editable_until,
           (d.user_id = v_user.id and now() <= d.editable_until),
           (d.user_id = v_user.id)
    from public.debts d
    where d.user_id = v_target
    order by (d.settled_on is not null),
             case when d.settled_on is null then coalesce(d.due_on, date '9999-12-31') end asc nulls last,
             d.settled_on desc nulls last,
             d.occurred_on desc,
             d.created_at desc;
end;
$$;

create or replace function public.get_debt_summary(p_user_id uuid default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user   public.users;
  v_target uuid;
  v_today  date := private.utc_today();
  v_result jsonb;
begin
  v_user := private.require_user();
  v_target := private.resolve_target(v_user, p_user_id);

  select jsonb_build_object(
    'borrowed_pending',       coalesce(sum(d.base_amount) filter (where d.direction = 'borrowed' and d.settled_on is null), 0),
    'borrowed_pending_count', count(*) filter (where d.direction = 'borrowed' and d.settled_on is null),
    'lent_pending',           coalesce(sum(d.base_amount) filter (where d.direction = 'lent' and d.settled_on is null), 0),
    'lent_pending_count',     count(*) filter (where d.direction = 'lent' and d.settled_on is null),
    'borrowed_settled',       coalesce(sum(d.base_amount) filter (where d.direction = 'borrowed' and d.settled_on is not null), 0),
    'lent_settled',           coalesce(sum(d.base_amount) filter (where d.direction = 'lent' and d.settled_on is not null), 0),
    'settled_count',          count(*) filter (where d.settled_on is not null),
    'overdue_count',          count(*) filter (where d.settled_on is null and d.due_on < v_today)
  )
  into v_result
  from public.debts d
  where d.user_id = v_target;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. API (RPC) — reports (every total is in the owner's main currency)
-- -----------------------------------------------------------------------------

create or replace function public.get_month_summary(p_month date, p_user_id uuid default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user   public.users;
  v_target uuid;
  v_from   date := private.month_start(coalesce(p_month, private.utc_today()));
  v_to     date;
  v_prev   date;
  v_result jsonb;
begin
  v_user := private.require_user();
  v_target := private.resolve_target(v_user, p_user_id);
  v_to := (v_from + interval '1 month')::date;
  v_prev := (v_from - interval '1 month')::date;

  with me as (
    select e.*
    from public.expenses e
    where e.user_id = v_target
      and e.spent_on >= v_from
      and e.spent_on < v_to
  )
  select jsonb_build_object(
    'month',              v_from,
    'currency',           (select u.currency from public.users u where u.id = v_target),
    'opening_balance',    private.balance_before(v_target, v_from),
    'closing_balance',    private.balance_before(v_target, v_to),
    'available_balance',  private.available_balance(v_target),
    'income_total',       (select coalesce(sum(i.base_amount), 0) from public.incomes i where i.user_id = v_target and i.month = v_from),
    'income_count',       (select count(*) from public.incomes i where i.user_id = v_target and i.month = v_from),
    'expense_total',      (select coalesce(sum(x.base_amount), 0) from me x),
    'expense_count',      (select count(*) from me x),
    'active_days',        (select count(distinct x.spent_on) from me x),
    'prev_income_total',  (select coalesce(sum(i.base_amount), 0) from public.incomes i where i.user_id = v_target and i.month = v_prev),
    'prev_expense_total', (select coalesce(sum(e.base_amount), 0) from public.expenses e
                            where e.user_id = v_target and e.spent_on >= v_prev and e.spent_on < v_from),
    'largest_expense',    (select jsonb_build_object('id', x.id, 'description', x.description, 'amount', x.base_amount,
                                                     'original_amount', x.amount, 'currency', x.currency,
                                                     'category', x.category, 'spent_on', x.spent_on)
                            from me x order by x.base_amount desc, x.created_at limit 1),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('date', d.spent_on, 'total', d.total, 'count', d.cnt) order by d.spent_on)
      from (select x.spent_on, sum(x.base_amount) as total, count(*) as cnt from me x group by x.spent_on) d
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('category', g.category, 'name', c.name, 'total', g.total, 'count', g.cnt)
                       order by g.total desc)
      from (select x.category, sum(x.base_amount) as total, count(*) as cnt from me x group by x.category) g
      join public.categories c on c.slug = g.category
    ), '[]'::jsonb),
    'payment_methods', coalesce((
      select jsonb_agg(jsonb_build_object('method', p.payment_method, 'total', p.total, 'count', p.cnt)
                       order by p.total desc)
      from (select x.payment_method, sum(x.base_amount) as total, count(*) as cnt from me x group by x.payment_method) p
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

create or replace function public.get_overall_summary(p_user_id uuid default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user   public.users;
  v_target uuid;
  v_result jsonb;
begin
  v_user := private.require_user();
  v_target := private.resolve_target(v_user, p_user_id);

  with months as (
    select m.month, sum(m.income) as income, sum(m.expense) as expense, sum(m.cnt) as cnt
    from (
      select i.month, i.base_amount as income, 0::numeric as expense, 0 as cnt
      from public.incomes i
      where i.user_id = v_target
      union all
      select private.month_start(e.spent_on), 0::numeric, e.base_amount, 1
      from public.expenses e
      where e.user_id = v_target
    ) m
    group by m.month
  )
  select jsonb_build_object(
    'currency',         (select u.currency from public.users u where u.id = v_target),
    'available',        private.available_balance(v_target),
    'income_total',     (select coalesce(sum(i.base_amount), 0) from public.incomes i where i.user_id = v_target),
    'expense_total',    (select coalesce(sum(e.base_amount), 0) from public.expenses e where e.user_id = v_target),
    'income_count',     (select count(*) from public.incomes i where i.user_id = v_target),
    'expense_count',    (select count(*) from public.expenses e where e.user_id = v_target),
    'first_expense_on', (select min(e.spent_on) from public.expenses e where e.user_id = v_target),
    'months', coalesce((
      select jsonb_agg(jsonb_build_object('month', mo.month, 'income', mo.income, 'expense', mo.expense, 'count', mo.cnt)
                       order by mo.month)
      from months mo
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('category', g.category, 'name', c.name, 'total', g.total, 'count', g.cnt)
                       order by g.total desc)
      from (
        select e.category, sum(e.base_amount) as total, count(*) as cnt
        from public.expenses e
        where e.user_id = v_target
        group by e.category
      ) g
      join public.categories c on c.slug = g.category
    ), '[]'::jsonb),
    'payment_methods', coalesce((
      select jsonb_agg(jsonb_build_object('method', p.payment_method, 'total', p.total, 'count', p.cnt)
                       order by p.total desc)
      from (
        select e.payment_method, sum(e.base_amount) as total, count(*) as cnt
        from public.expenses e
        where e.user_id = v_target
        group by e.payment_method
      ) p
    ), '[]'::jsonb),
    'largest_expense', (
      select jsonb_build_object('id', e.id, 'description', e.description, 'amount', e.base_amount,
                                'original_amount', e.amount, 'currency', e.currency,
                                'category', e.category, 'spent_on', e.spent_on)
      from public.expenses e
      where e.user_id = v_target
      order by e.base_amount desc, e.created_at
      limit 1
    )
  )
  into v_result;

  return v_result;
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. API (RPC) — super admin
--     Each account's numbers are in that account's own main currency.
-- -----------------------------------------------------------------------------

create or replace function public.admin_overview(p_month date)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user   public.users;
  v_from   date := private.month_start(coalesce(p_month, private.utc_today()));
  v_to     date;
  v_result jsonb;
begin
  v_user := private.require_user();
  if v_user.role <> 'superadmin' then
    raise exception 'Only the super admin can view all accounts.' using errcode = '42501';
  end if;
  v_to := (v_from + interval '1 month')::date;

  with per_user as (
    select
      u.id, u.email, u.full_name, u.avatar_url, u.role, u.is_active, u.currency, u.created_at,
      coalesce((select sum(i.base_amount) from public.incomes i where i.user_id = u.id and i.month = v_from), 0) as month_income,
      coalesce((select sum(e.base_amount) from public.expenses e
                where e.user_id = u.id and e.spent_on >= v_from and e.spent_on < v_to), 0) as month_expense,
      (select count(*) from public.expenses e
        where e.user_id = u.id and e.spent_on >= v_from and e.spent_on < v_to) as month_count,
      coalesce((select sum(i.base_amount) from public.incomes i where i.user_id = u.id), 0) as total_income,
      coalesce((select sum(e.base_amount) from public.expenses e where e.user_id = u.id), 0) as total_expense,
      (select count(*) from public.expenses e where e.user_id = u.id) as total_count,
      coalesce((select sum(d.base_amount) from public.debts d
                where d.user_id = u.id and d.direction = 'borrowed' and d.settled_on is null), 0) as borrowed_pending,
      coalesce((select sum(d.base_amount) from public.debts d
                where d.user_id = u.id and d.direction = 'lent' and d.settled_on is null), 0) as lent_pending,
      greatest(
        (select max(e.created_at) from public.expenses e where e.user_id = u.id),
        (select max(i.created_at) from public.incomes i where i.user_id = u.id),
        (select max(d.created_at) from public.debts d where d.user_id = u.id)
      ) as last_activity_at
    from public.users u
  )
  select jsonb_build_object(
    'month', v_from,
    'totals', jsonb_build_object(
      'users',        count(*),
      'active_users', count(*) filter (where pu.is_active)
    ),
    'users', coalesce(jsonb_agg(to_jsonb(pu) order by (pu.role = 'superadmin') desc, pu.created_at), '[]'::jsonb)
  )
  into v_result
  from per_user pu;

  return v_result;
end;
$$;

create or replace function public.admin_get_user(p_user_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user   public.users;
  v_target public.users;
begin
  v_user := private.require_user();
  if v_user.role <> 'superadmin' then
    raise exception 'Only the super admin can view other accounts.' using errcode = '42501';
  end if;

  select * into v_target from public.users u where u.id = p_user_id;
  if v_target.id is null then
    raise exception 'Account not found.' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id',         v_target.id,
    'email',      v_target.email,
    'full_name',  v_target.full_name,
    'avatar_url', v_target.avatar_url,
    'role',       v_target.role,
    'is_active',  v_target.is_active,
    'currency',   v_target.currency,
    'created_at', v_target.created_at
  );
end;
$$;

create or replace function public.admin_set_user_active(p_user_id uuid, p_active boolean)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user   public.users;
  v_target public.users;
begin
  v_user := private.require_user();
  if v_user.role <> 'superadmin' then
    raise exception 'Only the super admin can change account status.' using errcode = '42501';
  end if;

  if p_user_id = v_user.id then
    raise exception 'You cannot deactivate your own account.';
  end if;

  select * into v_target from public.users u where u.id = p_user_id for update;
  if v_target.id is null then
    raise exception 'Account not found.' using errcode = 'P0002';
  end if;
  if v_target.role = 'superadmin' then
    raise exception 'Super admin accounts cannot be deactivated.';
  end if;

  update public.users u set is_active = coalesce(p_active, true) where u.id = p_user_id;

  return jsonb_build_object('id', p_user_id, 'is_active', coalesce(p_active, true));
end;
$$;

-- CSV export. Users can export their own data; only the super admin can
-- export someone else's account or everyone at once.
drop function if exists public.export_transactions(uuid, date, boolean);

create or replace function public.export_transactions(
  p_user_id uuid default null,
  p_month date default null,
  p_all_users boolean default false
)
returns table (
  kind            text,
  user_name       text,
  user_email      text,
  entry_date      date,
  category        text,
  description     text,
  payment_method  text,
  status          text,
  amount          numeric,
  currency        text,
  rate            numeric,
  base_amount     numeric,
  base_currency   text,
  created_at      timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user   public.users;
  v_target uuid;
  v_from   date;
  v_to     date;
begin
  v_user := private.require_user();

  if coalesce(p_all_users, false) then
    if v_user.role <> 'superadmin' then
      raise exception 'Only the super admin can export all accounts.' using errcode = '42501';
    end if;
    v_target := null;
  else
    v_target := private.resolve_target(v_user, p_user_id);
  end if;

  if p_month is not null then
    v_from := private.month_start(p_month);
    v_to := (v_from + interval '1 month')::date;
  end if;

  return query
    select 'expense'::text, coalesce(nullif(u.full_name, ''), u.email), u.email, e.spent_on,
           c.name, e.description, e.payment_method, null::text,
           e.amount, e.currency, e.rate, e.base_amount, u.currency, e.created_at
    from public.expenses e
    join public.users u on u.id = e.user_id
    join public.categories c on c.slug = e.category
    where (v_target is null or e.user_id = v_target)
      and (v_from is null or (e.spent_on >= v_from and e.spent_on < v_to))
    union all
    select 'income'::text, coalesce(nullif(u.full_name, ''), u.email), u.email, i.month,
           i.source, coalesce(i.note, ''), null::text, null::text,
           i.amount, i.currency, i.rate, i.base_amount, u.currency, i.created_at
    from public.incomes i
    join public.users u on u.id = i.user_id
    where (v_target is null or i.user_id = v_target)
      and (v_from is null or i.month = v_from)
    union all
    select d.direction, coalesce(nullif(u.full_name, ''), u.email), u.email, d.occurred_on,
           d.counterparty, coalesce(d.note, ''), null::text,
           case when d.settled_on is null then 'pending' else 'settled ' || d.settled_on::text end,
           d.amount, d.currency, d.rate, d.base_amount, u.currency, d.created_at
    from public.debts d
    join public.users u on u.id = d.user_id
    where (v_target is null or d.user_id = v_target)
      and (v_from is null or (d.occurred_on >= v_from and d.occurred_on < v_to))
    order by 2, 4, 1, 14;
end;
$$;

-- -----------------------------------------------------------------------------
-- 12. API (RPC) — notifications
-- -----------------------------------------------------------------------------

create or replace function public.list_notifications(p_limit integer default 30, p_before timestamptz default null)
returns table (
  id                uuid,
  type              text,
  payload           jsonb,
  actor_id          uuid,
  actor_name        text,
  actor_avatar_url  text,
  read_at           timestamptz,
  created_at        timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user public.users;
begin
  v_user := private.require_user();

  return query
    select n.id, n.type, n.payload, n.actor_id,
           coalesce(nullif(a.full_name, ''), a.email, n.payload ->> 'actor_name', 'Someone'),
           a.avatar_url, n.read_at, n.created_at
    from public.notifications n
    left join public.users a on a.id = n.actor_id
    where n.recipient_id = v_user.id
      and (p_before is null or n.created_at < p_before)
    order by n.created_at desc
    limit least(greatest(coalesce(p_limit, 30), 1), 100);
end;
$$;

create or replace function public.get_unread_notification_count()
returns integer
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user public.users;
begin
  v_user := private.require_user();
  return (
    select count(*)::integer
    from public.notifications n
    where n.recipient_id = v_user.id and n.read_at is null
  );
end;
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user  public.users;
  v_count integer;
begin
  v_user := private.require_user();

  update public.notifications n
     set read_at = now()
   where n.recipient_id = v_user.id
     and n.read_at is null
     and (p_ids is null or n.id = any (p_ids));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- 12b. Balance — what is available to spend, across all months
-- -----------------------------------------------------------------------------

create or replace function public.get_balance(p_user_id uuid default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_user   public.users;
  v_target uuid;
begin
  v_user := private.require_user();
  v_target := private.resolve_target(v_user, p_user_id);

  return jsonb_build_object(
    'available',        private.available_balance(v_target),
    'income_total',     coalesce((select sum(i.base_amount) from public.incomes i where i.user_id = v_target), 0),
    'expense_total',    coalesce((select sum(e.base_amount) from public.expenses e where e.user_id = v_target), 0),
    'borrowed_pending', coalesce((select sum(d.base_amount) from public.debts d
                                  where d.user_id = v_target and d.direction = 'borrowed' and d.settled_on is null), 0),
    'lent_pending',     coalesce((select sum(d.base_amount) from public.debts d
                                  where d.user_id = v_target and d.direction = 'lent' and d.settled_on is null), 0),
    'currency',         (select u.currency from public.users u where u.id = v_target)
  );
end;
$$;


-- -----------------------------------------------------------------------------
-- 13. Budgets — monthly spending limits in the owner's main currency.
--     category NULL = the overall monthly budget. Budgets are settings, not
--     entries, so they can be changed at any time (no edit window).
-- -----------------------------------------------------------------------------

create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  category    text references public.categories (slug) on update cascade on delete cascade,
  amount      numeric(14, 2) not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint budgets_amount_range check (amount > 0 and amount <= 999999999999.99)
);

-- One overall budget and at most one budget per category, per account.
create unique index if not exists budgets_user_category_key on public.budgets (user_id, coalesce(category, ''));

alter table public.budgets enable row level security;

drop policy if exists "budgets: read own, superadmin reads all" on public.budgets;
create policy "budgets: read own, superadmin reads all"
  on public.budgets for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_superadmin()));

create or replace function public.list_budgets(p_user_id uuid default null)
returns table (id uuid, category text, category_name text, amount numeric, updated_at timestamptz)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user   public.users;
  v_target uuid;
begin
  v_user := private.require_user();
  v_target := private.resolve_target(v_user, p_user_id);

  return query
    select b.id, b.category, c.name, b.amount, b.updated_at
    from public.budgets b
    left join public.categories c on c.slug = b.category
    where b.user_id = v_target
    order by (b.category is not null), c.sort_order, c.name;
end;
$$;

create or replace function public.set_budget(p_category text, p_amount numeric)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
  v_row  public.budgets;
begin
  v_user := private.require_user();

  if v_user.currency is null then
    raise exception 'Choose your main currency first.';
  end if;
  if p_category is not null
     and not exists (select 1 from public.categories c where c.slug = p_category and c.is_active) then
    raise exception 'Please choose a valid category.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Budget must be greater than zero.';
  end if;
  if p_amount > 999999999999.99 then
    raise exception 'That budget is too large.';
  end if;

  perform pg_advisory_xact_lock(hashtext('expense_tracker.write:' || v_user.id::text));

  update public.budgets b
     set amount = round(p_amount, 2),
         updated_at = now()
   where b.user_id = v_user.id
     and b.category is not distinct from p_category
  returning * into v_row;

  if v_row.id is null then
    insert into public.budgets (user_id, category, amount)
    values (v_user.id, p_category, round(p_amount, 2))
    returning * into v_row;
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_budget(p_category text)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
begin
  v_user := private.require_user();
  delete from public.budgets b
   where b.user_id = v_user.id
     and b.category is not distinct from p_category;
end;
$$;

-- -----------------------------------------------------------------------------
-- 14. Onboarding — marks the welcome tour as seen (once per account).
-- -----------------------------------------------------------------------------

create or replace function public.complete_onboarding()
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_user public.users;
begin
  v_user := private.require_user();
  update public.users u set onboarded_at = coalesce(u.onboarded_at, now()) where u.id = v_user.id;
  return public.get_my_profile();
end;
$$;

-- -----------------------------------------------------------------------------
-- 15. Privileges
-- -----------------------------------------------------------------------------

-- Tables: read-only for signed-in users (RLS decides which rows), nothing for anon.
revoke all on table public.users, public.categories, public.incomes, public.expenses, public.debts, public.budgets, public.notifications
  from anon, authenticated;
grant select on table public.users, public.categories, public.incomes, public.expenses, public.debts, public.budgets, public.notifications
  to authenticated;

-- Private helpers: nobody calls these directly; RLS needs is_superadmin().
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_superadmin() to authenticated;

-- Auth triggers are not API functions.
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.handle_auth_user_updated() from public, anon, authenticated;

-- API functions: signed-in users only.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.get_my_profile()',
    'public.get_my_stats()',
    'public.update_my_profile(text)',
    'public.set_my_currency(text, jsonb)',
    'public.list_categories()',
    'public.add_expense(numeric, text, text, date, text, text, numeric)',
    'public.update_expense(uuid, numeric, text, text, date, text, text, numeric)',
    'public.delete_expense(uuid)',
    'public.list_expenses(date, uuid)',
    'public.add_income(date, numeric, text, text, text, numeric)',
    'public.update_income(uuid, date, numeric, text, text, text, numeric)',
    'public.delete_income(uuid)',
    'public.list_incomes(date, uuid)',
    'public.add_debt(text, text, numeric, text, date, date, text, numeric)',
    'public.update_debt(uuid, text, text, numeric, text, date, date, text, numeric)',
    'public.delete_debt(uuid)',
    'public.set_debt_settled(uuid, boolean, date)',
    'public.list_debts(uuid)',
    'public.get_debt_summary(uuid)',
    'public.get_balance(uuid)',
    'public.list_budgets(uuid)',
    'public.set_budget(text, numeric)',
    'public.delete_budget(text)',
    'public.complete_onboarding()',
    'public.get_month_summary(date, uuid)',
    'public.get_overall_summary(uuid)',
    'public.admin_overview(date)',
    'public.admin_get_user(uuid)',
    'public.admin_set_user_active(uuid, boolean)',
    'public.export_transactions(uuid, date, boolean)',
    'public.list_notifications(integer, timestamptz)',
    'public.get_unread_notification_count()',
    'public.mark_notifications_read(uuid[])'
  ]
  loop
    execute format('revoke all on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end $$;


-- -----------------------------------------------------------------------------
-- 16. Backfill accounts that signed up before this script was run
--     (the earliest one becomes superadmin if there isn't one yet)
-- -----------------------------------------------------------------------------

insert into public.users (id, email, full_name, avatar_url, role)
select
  a.id,
  coalesce(a.email, ''),
  left(btrim(coalesce(
    nullif(a.raw_user_meta_data ->> 'full_name', ''),
    nullif(a.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(a.email, ''), '@', 1)
  )), 80),
  left(coalesce(a.raw_user_meta_data ->> 'avatar_url', a.raw_user_meta_data ->> 'picture'), 1000),
  case
    when not exists (select 1 from public.users u where u.role = 'superadmin')
         and row_number() over (order by a.created_at) = 1
      then 'superadmin'::public.app_role
    else 'user'::public.app_role
  end
from auth.users a
where not exists (select 1 from public.users u where u.id = a.id)
on conflict (id) do nothing;

-- Done ✔
