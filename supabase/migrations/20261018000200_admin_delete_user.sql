-- Delete an account only after an MFA-verified admin confirms its email.
create or replace function public.admin_delete_user(p_user uuid, p_confirm_email text) returns void
language plpgsql security definer set search_path = '' as $$
declare target_email text;
begin
 if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
 select email into target_email from auth.users where id=p_user for update;
 if not found then raise exception 'User not found' using errcode = 'P0002'; end if;
 if p_user = auth.uid() then raise exception 'You cannot delete your own account here'; end if;
 if exists(select 1 from public.admin_users where user_id=p_user) then raise exception 'You cannot delete an admin'; end if;
 if target_email is null or lower(trim(p_confirm_email)) is distinct from lower(target_email) then
  raise exception 'The email does not match' using errcode = '22023';
 end if;
 insert into public.admin_log(admin_id,action,target,details)
 values(auth.uid(),'delete_user',p_user::text,jsonb_build_object(
  'email',target_email,
  'username',(select username from public.user_account where user_id=p_user),
  'tcg_accounts',(select count(*) from public.player_tcg_account where user_id=p_user),
  'wishlist_cards',(select coalesce(sum(w.quantity),0) from public.wishlist w join public.player_tcg_account a on a.tcg_account_id=w.tcg_account_id where a.user_id=p_user),
  'trade_cards',(select coalesce(sum(c.quantity),0) from public.cards_available_for_trade c join public.player_tcg_account a on a.tcg_account_id=c.tcg_account_id where a.user_id=p_user),
  'open_offers',(select count(*) from public.trade_offer o where o.status in ('pending','accepted') and exists(select 1 from public.player_tcg_account a where a.user_id=p_user and a.tcg_account_id in (o.from_account,o.to_account)))
 ));
 delete from public.friend where user_id=p_user or user_id_2=p_user;
 delete from public.player_tcg_account where user_id=p_user;
 delete from public.user_account where user_id=p_user;
 delete from auth.users where id=p_user;
end;
$$;
revoke all on function public.admin_delete_user(uuid,text) from public, anon;
grant execute on function public.admin_delete_user(uuid,text) to authenticated;
