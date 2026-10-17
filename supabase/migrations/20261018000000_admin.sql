-- Admin API: membership and a verified MFA session are both required.
create table if not exists public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade, added_at timestamptz default now());
create table if not exists public.admin_log (id bigint generated always as identity primary key, admin_id uuid, action text, target text, details jsonb, created_at timestamptz default now());
alter table public.admin_users enable row level security;
alter table public.admin_log enable row level security;
revoke all on public.admin_users, public.admin_log from public, anon, authenticated;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select coalesce(auth.jwt()->>'aal' = 'aal2', false) and exists(select 1 from public.admin_users a where a.user_id = auth.uid());
$$;
create or replace function public.admin_am_i_listed() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

create or replace function public.admin_card_sync_runs(p_limit int) returns table(id bigint, started_at timestamptz, finished_at timestamptz, sets_added text[], cards_added int, cards_updated int, error text)
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 if to_regclass('public.card_sync_runs') is not null then return query execute 'select r.id,r.started_at,r.finished_at,r.sets_added,r.cards_added,r.cards_updated,r.error from public.card_sync_runs r order by r.started_at desc,r.id desc limit $1' using greatest(1,least(coalesce(p_limit,50),200)); end if;
end;
$$;

create or replace function public.admin_overview() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare last_sync jsonb;
begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 if to_regclass('public.card_sync_runs') is not null then execute 'select to_jsonb(r) - ''id'' from public.card_sync_runs r order by r.started_at desc,r.id desc limit 1' into last_sync; end if;
return jsonb_build_object(
 'users_total',(select count(*) from auth.users),
 'users_new_24h',(select count(*) from auth.users where created_at >= now()-interval '24 hours'),
 'users_new_7d',(select count(*) from auth.users where created_at >= now()-interval '7 days'),
 'users_new_30d',(select count(*) from auth.users where created_at >= now()-interval '30 days'),
 'sign_ins_24h',(select count(*) from auth.audit_log_entries where payload->>'action'='login' and created_at >= now()-interval '24 hours'),
 'sign_ins_7d',(select count(*) from auth.audit_log_entries where payload->>'action'='login' and created_at >= now()-interval '7 days'),
 'active_users_7d',(select count(distinct payload->>'actor_id') from auth.audit_log_entries where payload->>'action'='login' and created_at >= now()-interval '7 days'),
 'banned_users',(select count(*) from auth.users where banned_until > now()),
 'tcg_accounts',(select count(*) from public.player_tcg_account),
 'wishlist_cards',(select coalesce(sum(quantity),0) from public.wishlist),
 'trade_cards',(select coalesce(sum(quantity),0) from public.cards_available_for_trade),
 'offers',(select coalesce(jsonb_object_agg(s.status,s.n),'{}'::jsonb) from (select status,count(*) n from public.trade_offer group by status) s),
 'exclusive_trades_open',(select count(*) from public.exclusive_trade),
 'notifications_unread',(select count(*) from public.notification where read_at is null), 'last_card_sync',last_sync);
end;
$$;

create or replace function public.admin_daily_counts(p_days int) returns table(day date, sign_ups int, sign_ins int)
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 return query select d.d::date,
 (select count(*)::int from auth.users u where u.created_at >= d.d and u.created_at < d.d+interval '1 day'),
 (select count(*)::int from auth.audit_log_entries a where a.payload->>'action'='login' and a.created_at >= d.d and a.created_at < d.d+interval '1 day')
 from generate_series(current_date-(greatest(1,least(coalesce(p_days,30),365))-1),current_date,interval '1 day') d(d) order by d.d;
end;
$$;

create or replace function public.admin_sign_ins(p_search text, p_action text, p_limit int, p_offset int) returns table(id uuid, created_at timestamptz, action text, user_id uuid, email text, username text, ip_address text, total_count bigint)
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 return query select a.id,a.created_at,a.payload->>'action',case when a.payload->>'actor_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then (a.payload->>'actor_id')::uuid end,coalesce(u.email::text,a.payload->>'actor_username'),ua.username::text,a.ip_address::text,count(*) over()
from auth.audit_log_entries a left join auth.users u on u.id::text=a.payload->>'actor_id' left join public.user_account ua on ua.user_id=u.id
where a.payload->>'action' in ('login','logout','user_signedup','user_deleted','token_revoked','user_recovery_requested')
and (coalesce(p_action,'')='' or a.payload->>'action'=p_action)
and (coalesce(p_search,'')='' or coalesce(u.email::text,a.payload->>'actor_username') ilike '%'||p_search||'%' or ua.username ilike '%'||p_search||'%')
order by a.created_at desc,a.id desc limit greatest(1, least(coalesce(p_limit, 50), 200)) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_users_list(p_search text, p_limit int, p_offset int) returns table(user_id uuid, email text, username text, created_at timestamptz, last_sign_in_at timestamptz, banned_until timestamptz, is_admin boolean, tcg_accounts int, wishlist_cards int, trade_cards int, open_offers int, total_count bigint)
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 return query select u.id,u.email::text,ua.username::text,u.created_at,u.last_sign_in_at,u.banned_until,
exists(select 1 from public.admin_users a where a.user_id=u.id),
(select count(*)::int from public.player_tcg_account a where a.user_id=u.id),
(select coalesce(sum(w.quantity),0)::int from public.wishlist w join public.player_tcg_account a on a.tcg_account_id=w.tcg_account_id where a.user_id=u.id),
(select coalesce(sum(t.quantity),0)::int from public.cards_available_for_trade t join public.player_tcg_account a on a.tcg_account_id=t.tcg_account_id where a.user_id=u.id),
(select count(*)::int from public.trade_offer o where o.status in ('pending','accepted') and exists(select 1 from public.player_tcg_account a where a.user_id=u.id and a.tcg_account_id in (o.from_account,o.to_account))),count(*) over()
from auth.users u left join public.user_account ua on ua.user_id=u.id
where coalesce(p_search,'')='' or u.email ilike '%'||p_search||'%' or ua.username ilike '%'||p_search||'%'
order by u.created_at desc,u.id limit greatest(1, least(coalesce(p_limit, 50), 200)) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_set_username(p_user uuid, p_username text) returns void
language plpgsql security definer set search_path = '' as $$

declare old_name text;
begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 select username into old_name from public.user_account where user_id=p_user for update;
 update public.user_account set username=btrim(p_username) where user_id=p_user; if not found then raise exception 'User not found' using errcode='P0002'; end if; insert into public.admin_log(admin_id,action,target,details) values(auth.uid(),'set_username',p_user::text,(select jsonb_build_object('email',u.email,'username',ua.username) from auth.users u left join public.user_account ua on ua.user_id=u.id where u.id=p_user) || jsonb_build_object('old_username',old_name));
end;
$$;

create or replace function public.admin_ban_user(p_user uuid, p_days int) returns void
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 if exists(select 1 from public.admin_users a where a.user_id=p_user) then raise exception 'You cannot ban an admin'; end if;
if p_days is not null and p_days < 1 then raise exception 'Enter a positive number of days' using errcode='22023'; end if;
-- A permanent ban is 100 years: GoTrue cannot read 'infinity' and fails every sign-in for that user.
update auth.users set banned_until=case when p_days is null then now()+interval '100 years' else now()+make_interval(days=>p_days) end where id=p_user;
if not found then raise exception 'User not found' using errcode='P0002'; end if;
delete from auth.sessions where user_id=p_user; insert into public.admin_log(admin_id,action,target,details) values(auth.uid(),'ban_user',p_user::text,(select jsonb_build_object('email',u.email,'username',ua.username) from auth.users u left join public.user_account ua on ua.user_id=u.id where u.id=p_user) || jsonb_build_object('days',p_days));
end;
$$;

create or replace function public.admin_unban_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 update auth.users set banned_until=null where id=p_user; if not found then raise exception 'User not found' using errcode='P0002'; end if; insert into public.admin_log(admin_id,action,target,details) values(auth.uid(),'unban_user',p_user::text,(select jsonb_build_object('email',u.email,'username',ua.username) from auth.users u left join public.user_account ua on ua.user_id=u.id where u.id=p_user));
end;
$$;

create or replace function public.admin_sign_out_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'User not found' using errcode='P0002'; end if; delete from auth.sessions where user_id=p_user; insert into public.admin_log(admin_id,action,target,details) values(auth.uid(),'sign_out_user',p_user::text,(select jsonb_build_object('email',u.email,'username',ua.username) from auth.users u left join public.user_account ua on ua.user_id=u.id where u.id=p_user));
end;
$$;

create or replace function public.admin_trade_offers(p_status text, p_search text, p_limit int, p_offset int) returns table(id bigint, created_at timestamptz, updated_at timestamptz, status text, exclusive boolean, from_name text, to_name text, give_card text, give_language text, get_card text, get_language text, from_done boolean, to_done boolean, total_count bigint)
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 return query with rows as (select o.id,o.created_at,o.updated_at,o.status,o.exclusive_trade_id is not null as exclusive,public.trade_account_name(o.from_account) as from_name,public.trade_account_name(o.to_account) as to_name,gc.card_name || ' · ' || gs.set_name || ' #' || regexp_replace(gc.card_local_id, '^.*-', '') as give_card,o.give_language,rc.card_name || ' · ' || rs.set_name || ' #' || regexp_replace(rc.card_local_id, '^.*-', '') as get_card,o.get_language,o.from_done,o.to_done
from public.trade_offer o join public.card gc on gc.card_id=o.give_card_id left join public.set gs on gs.set_id=gc.set_id join public.card rc on rc.card_id=o.get_card_id left join public.set rs on rs.set_id=rc.set_id)
select r.*,count(*) over() from rows r where (coalesce(p_status,'')='' or r.status=p_status) and (coalesce(p_search,'')='' or r.from_name ilike '%'||p_search||'%' or r.to_name ilike '%'||p_search||'%' or r.give_card ilike '%'||p_search||'%' or r.get_card ilike '%'||p_search||'%') order by r.created_at desc,r.id desc limit greatest(1, least(coalesce(p_limit, 50), 200)) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_cancel_trade_offer(p_offer bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare o public.trade_offer;
begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 select * into o from public.trade_offer where id=p_offer for update;
if o.id is null then raise exception 'Offer not found' using errcode='P0002'; end if;
if o.status not in ('pending','accepted') then raise exception 'This offer is already closed'; end if;
update public.trade_offer set status='cancelled',updated_at=now() where id=p_offer;
-- Accepted cancellations already notify one side via trade_offer_notify.
if o.status='pending' then
 perform public.notify_trade(o,o.from_account,'offer_cancelled'); perform public.notify_trade(o,o.to_account,'offer_cancelled');
elsif public.owns_tcg_account(o.from_account) then
 perform public.notify_trade(o,o.from_account,'offer_cancelled');
else perform public.notify_trade(o,o.to_account,'offer_cancelled'); end if;
insert into public.admin_log(admin_id,action,target,details) values(auth.uid(),'cancel_trade_offer',p_offer::text,jsonb_build_object(
 'from_name',public.trade_account_name(o.from_account),'to_name',public.trade_account_name(o.to_account),
 'give_card',(select c.card_name || ' · ' || s.set_name || ' #' || regexp_replace(c.card_local_id, '^.*-', '') from public.card c left join public.set s on s.set_id=c.set_id where c.card_id=o.give_card_id),
 'get_card',(select c.card_name || ' · ' || s.set_name || ' #' || regexp_replace(c.card_local_id, '^.*-', '') from public.card c left join public.set s on s.set_id=c.set_id where c.card_id=o.get_card_id),
 'old_status',o.status));
end;
$$;

create or replace function public.admin_exclusive_trades(p_search text, p_limit int, p_offset int) returns table(id bigint, created_at timestamptz, owner_name text, card text, language text, wanted_count int, pending_offers int, total_count bigint)
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 return query with rows as (select e.id,e.created_at,public.trade_account_name(t.tcg_account_id) as owner_name,c.card_name || ' · ' || s.set_name || ' #' || regexp_replace(c.card_local_id, '^.*-', '') as card,t.language,
(select count(*)::int from public.exclusive_trade_want w where w.exclusive_trade_id=e.id) as wanted_count,
(select count(*)::int from public.trade_offer o where o.exclusive_trade_id=e.id and o.status='pending') as pending_offers
from public.exclusive_trade e join public.cards_available_for_trade t on t.id=e.trade_card_id join public.card c on c.card_id=t.card_id left join public.set s on s.set_id=c.set_id)
select r.*,count(*) over() from rows r where coalesce(p_search,'')='' or r.owner_name ilike '%'||p_search||'%' or r.card ilike '%'||p_search||'%' order by r.created_at desc,r.id desc limit greatest(1, least(coalesce(p_limit, 50), 200)) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_end_exclusive_trade(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare context jsonb;

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 select jsonb_build_object('owner_name',public.trade_account_name(t.tcg_account_id),
 'card',c.card_name || ' · ' || s.set_name || ' #' || regexp_replace(c.card_local_id, '^.*-', '')) into context
 from public.exclusive_trade e join public.cards_available_for_trade t on t.id=e.trade_card_id
 join public.card c on c.card_id=t.card_id left join public.set s on s.set_id=c.set_id
 where e.id=p_id for update of e;
 delete from public.exclusive_trade where id=p_id; if not found then raise exception 'Exclusive trade not found' using errcode='P0002'; end if; insert into public.admin_log(admin_id,action,target,details) values(auth.uid(),'end_exclusive_trade',p_id::text,context);
end;
$$;

create or replace function public.admin_banned_words(p_search text, p_limit int, p_offset int) returns table(id uuid, word text, total_count bigint)
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 return query select b.id,b.word,count(*) over() from public.banned_words b where coalesce(p_search,'')='' or b.word ilike '%'||p_search||'%' order by b.word,b.id limit greatest(1, least(coalesce(p_limit, 50), 200)) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_add_banned_word(p_word text) returns void
language plpgsql security definer set search_path = '' as $$
declare word_id uuid;

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 p_word:=lower(btrim(p_word)); if coalesce(p_word,'')='' then raise exception 'Enter a word'; end if;
-- Serialize the duplicate check without changing the existing table contract.
lock table public.banned_words in share row exclusive mode;
if exists(select 1 from public.banned_words b where lower(btrim(b.word))=p_word) then raise exception 'That word is already banned'; end if;
insert into public.banned_words(word) values(p_word) returning id into word_id; insert into public.admin_log(admin_id,action,target,details) values(auth.uid(),'add_banned_word',word_id::text,jsonb_build_object('word',p_word));
end;
$$;

create or replace function public.admin_remove_banned_word(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare removed_word text;

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 delete from public.banned_words where id=p_id returning word into removed_word; if not found then raise exception 'Word not found' using errcode='P0002'; end if; insert into public.admin_log(admin_id,action,target,details) values(auth.uid(),'remove_banned_word',p_id::text,jsonb_build_object('word',removed_word));
end;
$$;

create or replace function public.admin_run_card_sync() returns void
language plpgsql security definer set search_path = '' as $$
declare sync_secret text; project_url text;
begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 select decrypted_secret into sync_secret from vault.decrypted_secrets where name='sync_cards_secret' order by created_at desc limit 1;
select decrypted_secret into project_url from vault.decrypted_secrets where name='project_url' order by created_at desc limit 1;
if coalesce(sync_secret,'')='' or coalesce(project_url,'')='' then raise exception 'The card sync is not set up on this database'; end if;
perform net.http_post(url:=rtrim(project_url,'/')||'/functions/v1/sync-cards',headers:=jsonb_build_object('Content-Type','application/json','x-sync-secret',sync_secret),body:='{}'::jsonb,timeout_milliseconds:=300000);
insert into public.admin_log(admin_id,action,target,details) values(auth.uid(),'run_card_sync','sync-cards','{}'::jsonb);
end;
$$;

create or replace function public.admin_log_list(p_limit int, p_offset int) returns table(id bigint, created_at timestamptz, admin_email text, action text, target text, details jsonb, total_count bigint)
language plpgsql security definer set search_path = '' as $$

begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 return query select l.id,l.created_at,u.email::text,l.action,l.target,l.details,count(*) over() from public.admin_log l left join auth.users u on u.id=l.admin_id order by l.created_at desc,l.id desc limit greatest(1, least(coalesce(p_limit, 50), 200)) offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.admin_am_i_listed() from public, anon;
grant execute on function public.admin_am_i_listed() to authenticated;

revoke all on function public.admin_card_sync_runs(int) from public, anon;
grant execute on function public.admin_card_sync_runs(int) to authenticated;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

revoke all on function public.admin_daily_counts(int) from public, anon;
grant execute on function public.admin_daily_counts(int) to authenticated;

revoke all on function public.admin_sign_ins(text, text, int, int) from public, anon;
grant execute on function public.admin_sign_ins(text, text, int, int) to authenticated;

revoke all on function public.admin_users_list(text, int, int) from public, anon;
grant execute on function public.admin_users_list(text, int, int) to authenticated;

revoke all on function public.admin_set_username(uuid, text) from public, anon;
grant execute on function public.admin_set_username(uuid, text) to authenticated;

revoke all on function public.admin_ban_user(uuid, int) from public, anon;
grant execute on function public.admin_ban_user(uuid, int) to authenticated;

revoke all on function public.admin_unban_user(uuid) from public, anon;
grant execute on function public.admin_unban_user(uuid) to authenticated;

revoke all on function public.admin_sign_out_user(uuid) from public, anon;
grant execute on function public.admin_sign_out_user(uuid) to authenticated;

revoke all on function public.admin_trade_offers(text, text, int, int) from public, anon;
grant execute on function public.admin_trade_offers(text, text, int, int) to authenticated;

revoke all on function public.admin_cancel_trade_offer(bigint) from public, anon;
grant execute on function public.admin_cancel_trade_offer(bigint) to authenticated;

revoke all on function public.admin_exclusive_trades(text, int, int) from public, anon;
grant execute on function public.admin_exclusive_trades(text, int, int) to authenticated;

revoke all on function public.admin_end_exclusive_trade(bigint) from public, anon;
grant execute on function public.admin_end_exclusive_trade(bigint) to authenticated;

revoke all on function public.admin_banned_words(text, int, int) from public, anon;
grant execute on function public.admin_banned_words(text, int, int) to authenticated;

revoke all on function public.admin_add_banned_word(text) from public, anon;
grant execute on function public.admin_add_banned_word(text) to authenticated;

revoke all on function public.admin_remove_banned_word(uuid) from public, anon;
grant execute on function public.admin_remove_banned_word(uuid) to authenticated;

revoke all on function public.admin_run_card_sync() from public, anon;
grant execute on function public.admin_run_card_sync() to authenticated;

revoke all on function public.admin_log_list(int, int) from public, anon;
grant execute on function public.admin_log_list(int, int) to authenticated;
