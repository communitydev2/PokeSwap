-- =============================================================================
-- Support page: goals, cost breakdown, contributions - run once in the Supabase
-- SQL Editor (NOT YET APPLIED)
-- =============================================================================
-- Money is stored in pence (integers) to avoid rounding errors. £36.00 = 3600.
-- Contributions are only ever written by the stripe-webhook Edge Function
-- (service role) after Stripe confirms a payment; the browser can't add them.
-- The public page reads totals through views, never individual payments.
-- =============================================================================


-- What the money is for ---------------------------------------------------------
-- kind 'monthly': this month's running costs (bar resets every calendar month).
--                 Keep exactly one active monthly goal.
-- kind 'upgrade': a one-time upgrade; money adds up until the target is reached.
create table if not exists public.funding_goals (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('monthly', 'upgrade')),
  title text not null,
  description text,
  target_pence integer not null check (target_pence > 0),
  sort integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Breakdown shown under the monthly bar, e.g. Server £20
create table if not exists public.monthly_costs (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount_pence integer not null check (amount_pence >= 0),
  sort integer not null default 0,
  active boolean not null default true
);

-- One row per confirmed payment (each monthly renewal is its own row)
create table if not exists public.contributions (
  id bigint generated always as identity primary key,
  -- Checkout payment intent (one-off) or invoice id (monthly); unique so a
  -- repeated Stripe notification is never counted twice
  stripe_object_id text not null unique,
  stripe_payment_intent text,
  kind text not null check (kind in ('one_off', 'monthly')),
  amount_pence integer not null check (amount_pence > 0),
  currency text not null default 'gbp',
  user_id uuid references auth.users (id) on delete set null,   -- null = guest
  goal_id uuid references public.funding_goals (id) on delete set null, -- null = monthly costs
  refunded boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists contributions_created_idx on public.contributions (created_at);
create index if not exists contributions_goal_idx on public.contributions (goal_id);
create index if not exists contributions_user_idx on public.contributions (user_id);

-- Supporters opt in to the public thank-you list
alter table public.user_account add column if not exists show_in_supporters boolean not null default false;


-- Row Level Security -------------------------------------------------------------
alter table public.funding_goals enable row level security;
alter table public.monthly_costs enable row level security;
alter table public.contributions enable row level security;

create policy "Active goals are public"
  on public.funding_goals for select to anon, authenticated using (active);

create policy "Active costs are public"
  on public.monthly_costs for select to anon, authenticated using (active);

-- Users can see their own contributions (nobody can insert/update from the app)
create policy "Users can see their own contributions"
  on public.contributions for select to authenticated
  using (user_id = (select auth.uid()));


-- Public totals ---------------------------------------------------------------
-- These views run with the owner's rights so they can total all contributions,
-- but they only expose sums and opted-in usernames - never amounts per person.

-- Progress per active goal: monthly = this calendar month (UTC), upgrade = all time
create or replace view public.funding_progress as
select
  g.id, g.kind, g.title, g.description, g.target_pence, g.sort,
  coalesce(
    case
      when g.kind = 'monthly' then (
        select sum(c.amount_pence) from public.contributions c
        where not c.refunded and c.goal_id is null
          and c.created_at >= date_trunc('month', now() at time zone 'utc') at time zone 'utc'
      )
      else (
        select sum(c.amount_pence) from public.contributions c
        where not c.refunded and c.goal_id = g.id
      )
    end, 0)::integer as raised_pence
from public.funding_goals g
where g.active;

-- Thank-you list: only users who opted in and have a username
create or replace view public.supporters_public as
select ua.username, min(c.created_at) as supporter_since
from public.contributions c
join public.user_account ua on ua.user_id = c.user_id
where ua.show_in_supporters and ua.username is not null and not c.refunded
group by ua.username
order by supporter_since;

grant select on public.funding_progress, public.supporters_public to anon, authenticated;

-- Badge: has the signed-in user supported in the last 35 days?
-- (monthly supporters keep it as long as their subscription renews)
create or replace function public.my_supporter_status()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contributions
    where user_id = auth.uid() and not refunded
      and created_at > now() - interval '35 days'
  );
$$;
revoke all on function public.my_supporter_status() from public, anon;
grant execute on function public.my_supporter_status() to authenticated;


-- Example goals - edit or delete these in the Table Editor -----------------------
insert into public.funding_goals (kind, title, description, target_pence, sort) values
  ('monthly', 'Monthly running costs', 'Keeps the site online and sign-in emails flowing.', 3600, 0),
  ('upgrade', 'Faster server', 'Move to a bigger database plan so the site stays quick as more players join.', 30000, 1),
  ('upgrade', 'More monthly emails', 'A larger email plan so sign-in codes always arrive.', 12000, 2);

insert into public.monthly_costs (label, amount_pence, sort) values
  ('Server (database + hosting)', 2000, 0),
  ('Email sending', 1500, 1),
  ('Domain name', 100, 2);
