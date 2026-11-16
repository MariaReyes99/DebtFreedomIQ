-- ════════════════════════════════════════════════════════════════════
-- DebtFreedomIQ database schema
-- Paste this WHOLE file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
-- "Users" are managed by Supabase Auth (auth.users); everything else is below.
-- ════════════════════════════════════════════════════════════════════

-- 1. Profiles (one per user)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  country text,
  signup_country text,
  last_login_country text,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2. Financial assessments (one row per Financial Health check)
create table if not exists public.financial_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  country text,
  currency text,
  monthly_income numeric not null default 0,
  monthly_expenses numeric not null default 0,
  monthly_debt_payments numeric not null default 0,
  savings numeric not null default 0,
  total_assets numeric not null default 0,
  total_debts numeric not null default 0,
  net_worth numeric,
  debt_to_income numeric,
  health_score int,
  stress_score int,
  emergency_score int,
  emergency_months numeric,
  situation jsonb,            -- hardship flags (behind on bills, collections, medical debt…)
  goals text,
  recommendations jsonb,      -- { summary, recommendations[], nextSteps[] }
  ai_source text,             -- 'openai' or 'rules'
  created_at timestamptz not null default now()
);

-- 3. Assets, 4. Debts, 5. Expenses (line items for an assessment)
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  assessment_id uuid references public.financial_assessments on delete cascade,
  name text not null,
  type text not null default 'other',          -- property, vehicle, investments, kiwisaver_super, business, other
  value numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  assessment_id uuid references public.financial_assessments on delete cascade,
  name text not null,
  type text not null default 'other',          -- mortgage, credit_card, personal_loan, car_loan, bnpl, student_loan, medical, tax, business, family, other
  balance numeric not null default 0,
  interest_rate numeric not null default 0,    -- % per year
  min_payment numeric not null default 0,      -- per month
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  assessment_id uuid references public.financial_assessments on delete cascade,
  category text not null,
  amount numeric not null default 0,           -- per month
  essential boolean not null default true,
  created_at timestamptz not null default now()
);

-- 6. Financial plans (My Freedom Plan)
create table if not exists public.financial_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  assessment_id uuid references public.financial_assessments on delete set null,
  title text not null default 'My Freedom Plan',
  strategy text not null default 'avalanche',  -- avalanche | snowball
  scenarios jsonb not null,                    -- conservative / balanced / aggressive results
  ai_summary jsonb,
  goals jsonb not null default '[]'::jsonb,    -- [{ id, title, target, current, due }]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. Subscriptions (free / premium one-time / premium_plus monthly)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  tier text not null check (tier in ('premium', 'premium_plus')),
  status text not null default 'active',       -- active | cancelled | past_due
  provider text not null default 'mock',       -- mock | stripe | waiver
  provider_ref text unique,                    -- Stripe checkout session / subscription id
  amount int,                                  -- minor units (cents)
  currency text,
  current_period_end timestamptz,              -- null for one-time purchases
  created_at timestamptz not null default now()
);

-- 8. Product events (to learn from the first 100 users)
create table if not exists public.events (
  id bigserial primary key,
  anon_id text,
  user_id uuid,
  name text not null,
  country text,
  props jsonb,
  created_at timestamptz not null default now()
);

create index if not exists assessments_user_created on public.financial_assessments (user_id, created_at desc);
create index if not exists plans_user_updated on public.financial_plans (user_id, updated_at desc);
create index if not exists subs_user on public.subscriptions (user_id);
create index if not exists events_name_created on public.events (name, created_at);

-- ── Row Level Security: users can only see their own data ──
alter table public.profiles enable row level security;
alter table public.financial_assessments enable row level security;
alter table public.assets enable row level security;
alter table public.debts enable row level security;
alter table public.expenses enable row level security;
alter table public.financial_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.events enable row level security;  -- no policies → server only

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
revoke update on public.profiles from authenticated;
grant update (full_name, country) on public.profiles to authenticated;

do $$
declare t text;
begin
  foreach t in array array['financial_assessments','assets','debts','expenses','financial_plans'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

-- Subscriptions are created by the server only; users can read their own.
drop policy if exists "own subscriptions read" on public.subscriptions;
create policy "own subscriptions read" on public.subscriptions for select using (auth.uid() = user_id);

-- Create a profile automatically when someone registers
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, country, signup_country)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'country', new.raw_user_meta_data->>'signup_country')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ── Local area (for "near you" help). Safe to run again. ──
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists region text;
alter table public.profiles add column if not exists latitude numeric;
alter table public.profiles add column if not exists longitude numeric;
grant update (full_name, country, city) on public.profiles to authenticated;
