-- =============================================================================
-- Username recovery - run once in the Supabase SQL Editor (NOT YET APPLIED)
-- =============================================================================
-- Used by the `recover-username` Edge Function. Nothing here is reachable from
-- the browser: the lookup function is only executable by the service role, and
-- the rate-limit table has RLS on with no policies.
-- =============================================================================

-- Look up the username for an email address.
-- security definer so it can read auth.users; execute revoked from everyone
-- except the service role (used only inside the Edge Function).
create or replace function public.get_username_by_email(p_email text)
returns text
language sql
security definer
set search_path = ''
as $$
  select ua.username
  from auth.users u
  join public.user_account ua on ua.user_id = u.id
  where lower(u.email) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.get_username_by_email(text) from public, anon, authenticated;
grant execute on function public.get_username_by_email(text) to service_role;


-- Recent recovery requests, for rate limiting. Emails and IPs are stored as
-- SHA-256 hashes, never in plain text.
create table if not exists public.username_recovery_requests (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip_hash text not null,
  requested_at timestamptz not null default now()
);

create index if not exists username_recovery_requests_email_idx
  on public.username_recovery_requests (email_hash, requested_at);
create index if not exists username_recovery_requests_ip_idx
  on public.username_recovery_requests (ip_hash, requested_at);

-- RLS on with no policies: only the service role (Edge Function) can touch it.
alter table public.username_recovery_requests enable row level security;

-- Optional housekeeping: delete rows older than a day, e.g. with pg_cron:
--   select cron.schedule('purge-username-recovery', '0 3 * * *',
--     $$delete from public.username_recovery_requests where requested_at < now() - interval '1 day'$$);
