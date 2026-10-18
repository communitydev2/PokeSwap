create table public.user_account (user_id uuid primary key, username varchar(30), last_logged_in date);
create table public.banned_words (word text);
insert into public.banned_words values ('blocked');
create function public.is_admin() returns boolean language sql as $$
  select coalesce(current_setting('test.admin', true), '') = 'yes';
$$;
