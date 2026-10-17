-- Username rules: case-insensitive uniqueness and a banned-word check that ignores blank words.
-- Security definer so the duplicate check can see other players' rows (RLS only shows your own).

create or replace function public.block_banned_usernames()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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

delete from public.banned_words where btrim(word) = '';

do $$
begin
  if not exists (
    select 1 from public.user_account group by lower(username) having count(*) > 1
  ) then
    create unique index if not exists user_account_username_lower_key
      on public.user_account (lower(username));
  else
    raise notice 'Case-variant usernames exist; skipping user_account_username_lower_key';
  end if;
end;
$$;
