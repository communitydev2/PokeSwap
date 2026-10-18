-- First-name setup is free; subsequent player renames have a 30-day cooldown.
alter table public.user_account add column username_changed_at timestamptz;

create or replace function public.block_banned_usernames()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    new.username_changed_at := null;
  elsif TG_OP = 'UPDATE' then
    -- Always discard client-supplied timestamps, including for admins.
    new.username_changed_at := old.username_changed_at;
    if old.username is not null
      and new.username is distinct from old.username
      and not public.is_admin() then
      if old.username_changed_at is not null
        and old.username_changed_at > now() - interval '30 days' then
        raise exception 'You can change your username once every 30 days' using errcode = '42501';
      end if;
      new.username_changed_at := now();
    end if;
  end if;

  -- Name checks only when the name is set or changed (the trigger also runs for other columns)
  if TG_OP = 'UPDATE' and new.username is not distinct from old.username then
    return new;
  end if;

  if exists (
    select 1 from public.user_account ua
    where lower(ua.username) = lower(new.username)
      and ua.user_id <> new.user_id
  ) then
    raise exception 'This username is already taken' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.banned_words bw
    where btrim(bw.word) <> ''
      and lower(new.username) ~ (
        '(^|[^[:alnum:]_])'
        || regexp_replace(lower(bw.word), '([.^$*+?()\[\]{}|\\-])', '\\\1', 'g')
        || '([^[:alnum:]_]|$)'
      )
  ) then
    raise exception 'Username contains a banned word';
  end if;
  return new;
end;
$$;

-- The trigger used to fire only on UPDATE OF username, so an update touching only
-- username_changed_at could reset the cooldown. Fire on every update instead.
drop trigger if exists trg_block_banned_usernames on public.user_account;
create trigger trg_block_banned_usernames
  before insert or update on public.user_account
  for each row execute function public.block_banned_usernames();
