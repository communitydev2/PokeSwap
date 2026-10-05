-- =============================================================================
-- Monthly card sync from TCGdex - run once in the Supabase SQL Editor
-- (NOT YET APPLIED). Run the sections in order.
-- =============================================================================


-- 1. Columns and constraints the sync relies on ------------------------------
-- Sets and cards are matched by their TCGdex ids, so these must be unique.
-- (Checked on 2026-10-05: no duplicates in either column.)
alter table public.set add constraint set_set_code_key unique (set_code);
alter table public.card add constraint card_card_local_id_key unique (card_local_id);
alter table public.rarity add constraint rarity_name_key unique (name);

-- When a set was released and when the sync added it. Existing sets keep
-- added_at = null so they aren't announced as "new".
alter table public.set add column if not exists release_date date;
alter table public.set add column if not exists added_at timestamptz;

-- Cards from brand-new sets can arrive before TCGdex has their pictures
alter table public.card alter column card_image drop not null;


-- 2. Log of sync runs (only the sync function writes here) --------------------
create table if not exists public.card_sync_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  sets_added text[] not null default '{}',
  cards_added integer not null default 0,
  cards_updated integer not null default 0,
  error text
);
alter table public.card_sync_runs enable row level security;  -- no policies: service role only


-- 3. Monthly schedule -----------------------------------------------------------
-- Needs the pg_cron and pg_net extensions (Database -> Extensions, or):
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store the same secret you set for the function (SYNC_SECRET) in Vault.
-- Replace both placeholders before running.
select vault.create_secret('<the SYNC_SECRET value>', 'sync_cards_secret');

-- 04:00 UTC on the 1st of every month
select cron.schedule(
  'sync-cards-monthly',
  '0 4 1 * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/sync-cards',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'sync_cards_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- Useful checks:
--   select * from public.card_sync_runs order by started_at desc;   -- what each run did
--   select * from cron.job;                                           -- the schedule
--   select cron.unschedule('sync-cards-monthly');                     -- turn it off
