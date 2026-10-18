-- Keep unfinished profiles nullable, but require chosen names to stay nonempty
-- so renames never send an existing player back through first-name setup.
create or replace function public.block_banned_usernames()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.username is not null and btrim(new.username) = '')
    or (TG_OP = 'UPDATE' and old.username is not null and new.username is null) then
    raise exception 'Username is required' using errcode = '22023';
  end if;

  if TG_OP = 'INSERT' then
    new.username_changed_at := null;
  elsif TG_OP = 'UPDATE' then
    new.username_changed_at := old.username_changed_at;
    if (old.username is not null or old.username_changed_at is not null)
      and new.username is distinct from old.username
      and not public.is_admin() then
      if old.username_changed_at is not null
        and old.username_changed_at > now() - interval '30 days' then
        raise exception 'You can change your username once every 30 days' using errcode = '42501';
      end if;
      new.username_changed_at := now();
    end if;
  end if;

  if TG_OP = 'UPDATE' and new.username is not distinct from old.username then
    return new;
  end if;
  if exists (
    select 1 from public.user_account ua
    where lower(ua.username) = lower(new.username) and ua.user_id <> new.user_id
  ) then
    raise exception 'This username is already taken' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.banned_words bw
    where btrim(bw.word) <> '' and lower(new.username) ~ (
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
