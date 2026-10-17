-- Usernames are permanent once chosen; authenticated admins may still moderate them.
create or replace function public.block_banned_usernames()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if TG_OP = 'UPDATE' then
    if old.username is not null
      and new.username is distinct from old.username
      and not public.is_admin() then
      raise exception 'Your username can''t be changed' using errcode = '42501';
    end if;
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
