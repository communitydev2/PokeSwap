-- Remove rarities that cannot be traded in Pokémon TCG Pocket.
-- One atomic statement; rerunning it is safe. Lock writers while collecting
-- targets so no new references can appear between cleanup and card deletion.
do $$
declare
  card_ids uuid[];
  local_ids text[];
  listing_ids bigint[];
  affected bigint;
begin
  lock table public.rarity, public.card, public.notification, public.trade_offer,
    public.exclusive_trade_want, public.exclusive_trade,
    public.cards_available_for_trade, public.wishlist in share row exclusive mode;

  select coalesce(array_agg(c.card_id), '{}'::uuid[]),
         coalesce(array_agg(c.card_local_id), '{}'::text[])
    into card_ids, local_ids
    from public.card c join public.rarity r on r.rarity_id = c.rarity_id
    where r.name in ('Three Star', 'Crown');

  select coalesce(array_agg(e.id), '{}'::bigint[]) into listing_ids
    from public.exclusive_trade e
    join public.cards_available_for_trade t on t.id = e.trade_card_id
    where t.card_id = any(card_ids);

  delete from public.notification
    where my_card_id = any(card_ids) or their_card_id = any(card_ids)
       or trade_offer_id in (
         select id from public.trade_offer
         where give_card_id = any(card_ids) or get_card_id = any(card_ids)
            or exclusive_trade_id = any(listing_ids)
       );
  get diagnostics affected = row_count;
  raise notice 'notification deleted: %', affected;

  -- Also remove offers on the affected listings before their deletion trigger
  -- runs, so it cannot create fresh notifications for cards being removed.
  delete from public.trade_offer
    where give_card_id = any(card_ids) or get_card_id = any(card_ids)
       or exclusive_trade_id = any(listing_ids);
  get diagnostics affected = row_count;
  raise notice 'trade_offer deleted: %', affected;

  delete from public.exclusive_trade_want
    where card_id = any(card_ids) or exclusive_trade_id = any(listing_ids);
  get diagnostics affected = row_count;
  raise notice 'exclusive_trade_want deleted: %', affected;

  delete from public.exclusive_trade where id = any(listing_ids);
  get diagnostics affected = row_count;
  raise notice 'exclusive_trade deleted: %', affected;

  delete from public.cards_available_for_trade where card_id = any(card_ids);
  get diagnostics affected = row_count;
  raise notice 'cards_available_for_trade deleted: %', affected;

  delete from public.wishlist where card_id = any(card_ids);
  get diagnostics affected = row_count;
  raise notice 'wishlist deleted: %', affected;

  -- Today reprint_of holds card_local_id text, not a foreign key. Clear both
  -- forms so this also works if it becomes a reference to card_id later.
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'card' and column_name = 'reprint_of'
  ) then
    execute 'update public.card set reprint_of = null
             where reprint_of::text = any($1) or reprint_of::text = any($2)'
      using local_ids, card_ids::text[];
    get diagnostics affected = row_count;
    raise notice 'card reprint_of cleared: %', affected;
  end if;

  delete from public.card where card_id = any(card_ids);
  get diagnostics affected = row_count;
  raise notice 'card deleted: %', affected;

  delete from public.rarity where name in ('Three Star', 'Crown');
  get diagnostics affected = row_count;
  raise notice 'rarity deleted: %', affected;
end $$;
