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

-- ── Ticked "next steps" on an assessment. Safe to run again. ──
alter table public.financial_assessments add column if not exists completed_steps jsonb not null default '[]'::jsonb;

-- ── Billing: cancellations, saved cards, recurring payments, reminders. Safe to run again. ──
alter table public.subscriptions add column if not exists cancelled_at timestamptz;
alter table public.subscriptions add column if not exists past_due_since timestamptz;
alter table public.subscriptions add column if not exists last_reminder_at timestamptz;
alter table public.subscriptions add column if not exists reminders_sent int not null default 0;
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions add constraint subscriptions_status_check check (status in ('active','past_due','cancelled','expired'));
alter table public.profiles add column if not exists stripe_customer_id text;

-- Saved cards (demo mode). Only brand + last 4 digits + expiry are stored, never the full number.
-- In Stripe mode, cards live in Stripe and this table is not used.
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider text not null default 'mock',
  brand text, last4 text, exp_month int, exp_year int,
  created_at timestamptz not null default now()
);
-- Every charge (first payment and renewals)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  subscription_id uuid references public.subscriptions on delete set null,
  amount int not null, currency text, status text not null default 'paid', -- paid | failed
  provider text not null default 'mock', description text,
  created_at timestamptz not null default now()
);
alter table public.payment_methods enable row level security;
alter table public.payments enable row level security;
drop policy if exists "own cards read" on public.payment_methods;
create policy "own cards read" on public.payment_methods for select using (auth.uid() = user_id);
drop policy if exists "own payments read" on public.payments;
create policy "own payments read" on public.payments for select using (auth.uid() = user_id);
-- (cards and payments are written by the server only)

-- Property use: home | rental | other (so the plan never suggests selling the family home by mistake)
alter table public.assets add column if not exists use text;

-- Full copy of each health check's answers (backup for rebuilding plans)
alter table public.financial_assessments add column if not exists input jsonb;

-- Freedom Plan: the Simulator choices it's built from, and which steps are ticked off
alter table public.financial_plans add column if not exists choices jsonb;
alter table public.financial_plans add column if not exists steps_done jsonb not null default '[]'::jsonb;

-- ── Access for the app's API keys. Newer Supabase projects don't grant this automatically. Safe to run again. ──
grant usage on schema public to anon, authenticated, service_role;
-- The server (secret key) manages everything; Row Level Security does not apply to it
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
-- Logged-in people: their own health checks and plans (Row Level Security limits them to their own rows)
grant select, insert, update, delete on public.financial_assessments, public.assets, public.debts, public.expenses, public.financial_plans to authenticated;
-- Read-only for their own profile, subscriptions, cards and payments; profile edits limited to these fields
grant select on public.profiles, public.subscriptions, public.payment_methods, public.payments to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, country, city) on public.profiles to authenticated;

-- Tell the Supabase API to pick up the new tables and columns straight away
notify pgrst, 'reload schema';

-- ── Customer support, testimonials and the admin audit log (Nov 2026). Safe to run again. ──
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null,
  email text not null,
  name text,
  topic text not null default 'other',
  message text not null,
  status text not null default 'open' check (status in ('open','resolved')),
  internal_note text,
  country text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists support_messages_status_idx on public.support_messages (status, created_at desc);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  display_name text,
  country text,
  story text not null,
  outcome text,
  consent boolean not null default false,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit (
  id bigserial primary key,
  admin_email text not null,
  action text not null,
  target_user uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- Server only: no policies, so the app's public keys can't read or write these.
alter table public.support_messages enable row level security;
alter table public.testimonials enable row level security;
alter table public.admin_audit enable row level security;
grant all on public.support_messages, public.testimonials, public.admin_audit to service_role;
grant usage, select on all sequences in schema public to service_role;
-- Admins can give complimentary access; keep the provider list open-ended (mock, stripe, waiver, test, complimentary).

notify pgrst, 'reload schema';
