-- Notify other players when added cards complete a normal, reciprocal match.
-- Table-level SELECT grants and owner RLS also cover the new nullable column.
alter table public.notification
  add column match_account uuid references public.player_tcg_account (tcg_account_id) on delete cascade;
alter table public.notification drop constraint notification_kind_check;
alter table public.notification add constraint notification_kind_check
  check (kind in ('offer_received', 'offer_accepted', 'offer_declined', 'offer_cancelled', 'partner_done', 'trade_match'));

create index notification_match_rate_limit
  on public.notification (match_account, tcg_account_id, created_at desc)
  where kind = 'trade_match';
-- Existing list indexes start with account; matching also looks up other
-- accounts by the newly added card and language.
create index wishlist_card_language_account on public.wishlist (card_id, language, tcg_account_id);

-- Keep batch validation, aggregation, upserts and saved-row count unchanged.
-- Definer rights allow matching private lists and writing notifications;
-- the explicit ownership check remains the authorization boundary.
create or replace function public.add_cards_to_tcg_account(p_tcg_account_id uuid, p_category text, p_cards jsonb)
  returns integer
  language plpgsql
  security definer
  set search_path = ''
  as $$
declare
  saved integer;
begin
  if not public.owns_tcg_account(p_tcg_account_id) then
    raise exception 'TCG account not found' using errcode = '42501';
  end if;
  if jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) = 0 then
    raise exception 'No cards to add' using errcode = '22023';
  end if;

  -- Serialize additions by this account before changing lists or checking the
  -- rate limit, including concurrent batches touching different cards.
  perform 1 from public.player_tcg_account
    where tcg_account_id = p_tcg_account_id for update;

  if p_category = 'wishlist' then
    insert into public.wishlist as w (tcg_account_id, card_id, language, quantity)
    select p_tcg_account_id, c.card_id, c.language, sum(c.quantity)
    from jsonb_to_recordset(p_cards) as c(card_id uuid, language text, quantity integer)
    group by c.card_id, c.language
    on conflict (tcg_account_id, card_id, language)
      do update set quantity = w.quantity + excluded.quantity, updated_at = now();
  elsif p_category = 'trade' then
    insert into public.cards_available_for_trade as t (tcg_account_id, card_id, language, quantity)
    select p_tcg_account_id, c.card_id, c.language, sum(c.quantity)
    from jsonb_to_recordset(p_cards) as c(card_id uuid, language text, quantity integer)
    group by c.card_id, c.language
    on conflict (tcg_account_id, card_id, language)
      do update set quantity = t.quantity + excluded.quantity, updated_at = now();
  else
    raise exception 'Unknown card category %', p_category using errcode = '22023';
  end if;

  get diagnostics saved = row_count;

  -- Each recipient sees the cards from their own point of view. Restrict the
  -- pairs to the submitted card AND language on the list that was changed.
  with added as (
    select distinct c.card_id, c.language
    from jsonb_to_recordset(p_cards) as c(card_id uuid, language text, quantity integer)
  ), pairs as (
    select distinct on (a.tcg_account_id)
      a.user_id, a.tcg_account_id, mt.card_id as my_card, pt.card_id as their_card
    from public.cards_available_for_trade pt
    join public.wishlist mw on mw.card_id = pt.card_id and mw.language = pt.language
    join public.player_tcg_account a on a.tcg_account_id = mw.tcg_account_id
    join public.card pc on pc.card_id = pt.card_id
    join public.cards_available_for_trade mt on mt.tcg_account_id = a.tcg_account_id
    join public.card mc on mc.card_id = mt.card_id and mc.rarity_id = pc.rarity_id
    join public.wishlist pw on pw.tcg_account_id = p_tcg_account_id
      and pw.card_id = mt.card_id and pw.language = mt.language
    where pt.tcg_account_id = p_tcg_account_id
      and a.user_id <> (select auth.uid())
      and public.rarity_is_tradable(pc.rarity_id)
      and not exists (select 1 from public.exclusive_trade e where e.trade_card_id = pt.id)
      and not exists (select 1 from public.exclusive_trade e where e.trade_card_id = mt.id)
      and exists (
        select 1 from added c
        where (p_category = 'trade' and c.card_id = pt.card_id and c.language = pt.language)
           or (p_category = 'wishlist' and c.card_id = pw.card_id and c.language = pw.language)
      )
    order by a.tcg_account_id, mt.card_id, pt.card_id, mt.language, pt.language
  )
  insert into public.notification
    (user_id, tcg_account_id, kind, partner_name, my_card_id, their_card_id, match_account)
  select p.user_id, p.tcg_account_id, 'trade_match',
    public.trade_account_name(p_tcg_account_id), p.my_card, p.their_card, p_tcg_account_id
  from pairs p
  where not exists (
    select 1 from public.notification n
    where n.kind = 'trade_match' and n.tcg_account_id = p.tcg_account_id
      and n.match_account = p_tcg_account_id
      and n.created_at > now() - interval '24 hours'
  );

  return saved;
end $$;

revoke all on function public.add_cards_to_tcg_account(uuid, text, jsonb) from public, anon;
grant execute on function public.add_cards_to_tcg_account(uuid, text, jsonb) to authenticated;
