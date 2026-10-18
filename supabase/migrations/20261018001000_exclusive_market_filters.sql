-- Filter exclusive listings without exposing player identities to anonymous visitors.
create function public.market_exclusive_trades_filtered(
  p_search text default '', p_set_id uuid default null, p_rarity_id uuid default null,
  p_only_answerable boolean default false, p_only_wishlist boolean default false,
  p_limit integer default 50, p_offset integer default 0
) returns table (
  exclusive_trade_id bigint, owner_account uuid, owner_name text, card jsonb,
  language text, want_language text, want_cards jsonb, created_at timestamptz,
  is_mine boolean, total_count bigint, answerable boolean, on_my_wishlist boolean
)
language sql stable security definer set search_path = '' as $$
  with viewer as (select auth.uid() as id), search as (
    select btrim(replace(replace(coalesce(p_search, ''), '%', ''), '_', '')) as term
  ), listings as (
    select e.id, t.tcg_account_id,
      case when v.id is not null then public.trade_account_name(t.tcg_account_id) end as owner_name,
      to_jsonb(c) as card, t.language, e.want_language,
      coalesce((select jsonb_agg(to_jsonb(wc) order by wc.card_local_id)
        from public.exclusive_trade_want w join public.card wc on wc.card_id = w.card_id
        where w.exclusive_trade_id = e.id), '[]'::jsonb) as want_cards,
      e.created_at,
      exists (select 1 from public.player_tcg_account a where a.tcg_account_id = t.tcg_account_id and a.user_id = v.id) as is_mine,
      exists (select 1 from public.exclusive_trade_want w
        join public.cards_available_for_trade mine on mine.card_id = w.card_id
        join public.player_tcg_account a on a.tcg_account_id = mine.tcg_account_id and a.user_id = v.id
        where w.exclusive_trade_id = e.id and mine.language = e.want_language
          and not exists (select 1 from public.exclusive_trade held where held.trade_card_id = mine.id)) as answerable,
      exists (select 1 from public.wishlist w
        join public.player_tcg_account a on a.tcg_account_id = w.tcg_account_id and a.user_id = v.id
        where w.card_id = c.card_id and w.language = t.language) as on_my_wishlist
    from public.exclusive_trade e
    join public.cards_available_for_trade t on t.id = e.trade_card_id
    join public.card c on c.card_id = t.card_id
    cross join viewer v cross join search s
    where (p_set_id is null or c.set_id = p_set_id)
      and (p_rarity_id is null or c.rarity_id = p_rarity_id)
      and (s.term = '' or c.card_name ilike '%' || s.term || '%'
        or c.card_local_id ilike '%' || s.term || '%'
        or exists (select 1 from public.exclusive_trade_want w join public.card wc on wc.card_id = w.card_id
          where w.exclusive_trade_id = e.id and wc.card_name ilike '%' || s.term || '%'))
  )
  select l.id, l.tcg_account_id, l.owner_name, l.card, l.language, l.want_language,
    l.want_cards, l.created_at, l.is_mine, count(*) over (), l.answerable, l.on_my_wishlist
  from listings l cross join viewer v
  where (v.id is null or not coalesce(p_only_answerable, false) or l.answerable)
    and (v.id is null or not coalesce(p_only_wishlist, false) or l.on_my_wishlist)
  order by l.created_at desc, l.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke all on function public.market_exclusive_trades_filtered(text, uuid, uuid, boolean, boolean, integer, integer) from public;
grant execute on function public.market_exclusive_trades_filtered(text, uuid, uuid, boolean, boolean, integer, integer) to anon, authenticated;
