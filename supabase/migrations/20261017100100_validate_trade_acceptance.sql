-- Recheck both trade lists before accepting a stale offer.
create or replace function public.respond_trade_offer(p_offer bigint, p_accept boolean) returns void
  language plpgsql security definer set search_path = ''
  as $$
declare
  o public.trade_offer;
  copies integer;
begin
  select * into o from public.trade_offer where id = p_offer for update;
  if o.id is null or not public.owns_tcg_account(o.to_account) then
    raise exception 'Offer not found' using errcode = 'P0002';
  end if;
  if o.status <> 'pending' then
    raise exception 'This offer has already been answered' using errcode = '22023';
  end if;
  if p_accept and not exists (
    select 1 from public.cards_available_for_trade where tcg_account_id = o.to_account and card_id = o.get_card_id and language = o.get_language
  ) then
    raise exception 'That card is not on your trade list' using errcode = '22023';
  end if;
  if p_accept and not exists (
    select 1 from public.cards_available_for_trade where tcg_account_id = o.from_account and card_id = o.give_card_id and language = o.give_language
  ) then
    raise exception 'The other player no longer has that card for trade' using errcode = '22023';
  end if;
  update public.trade_offer
    set status = case when p_accept then 'accepted' else 'declined' end, updated_at = now()
    where id = p_offer;

  if p_accept and o.exclusive_trade_id is not null then
    select t.quantity into copies from public.cards_available_for_trade t
      where t.tcg_account_id = o.to_account and t.card_id = o.get_card_id and t.language = o.get_language;
    if (select count(*) from public.trade_offer
        where exclusive_trade_id = o.exclusive_trade_id and status = 'accepted' and not to_done) >= coalesce(copies, 0) then
      update public.trade_offer set status = 'declined', updated_at = now()
        where exclusive_trade_id = o.exclusive_trade_id and status = 'pending';
    end if;
  end if;
end $$;


