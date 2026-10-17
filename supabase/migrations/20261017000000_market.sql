-- =============================================================================
-- Home page market: browse cards and exclusive trades
-- =============================================================================
-- Anyone can browse trade-list and wishlist counts, players offering or wanting
-- a card, and exclusive listings with their wanted cards. Player names are only
-- returned to signed-in users; signed-out visitors receive null names and false
-- ownership flags. These read-only functions leave existing trading rules and
-- table policies unchanged.
-- =============================================================================


-- Distinct accounts per card, across all languages (not the copy quantities)
create function public.market_card_counts()
  returns table (card_id uuid, has_count integer, wants_count integer)
  language sql stable security definer set search_path = ''
  as $$
    with entries as (
      select t.card_id, t.tcg_account_id, 'has'::text as side
      from public.cards_available_for_trade t
      union all
      select w.card_id, w.tcg_account_id, 'wants'::text as side
      from public.wishlist w
    )
    select e.card_id,
      (count(distinct e.tcg_account_id) filter (where e.side = 'has'))::integer,
      (count(distinct e.tcg_account_id) filter (where e.side = 'wants'))::integer
    from entries e
    group by e.card_id;
  $$;


-- Each side has its own cap; the caller's accounts sort after other players
create function public.market_card_players(p_card uuid)
  returns table (
    tcg_account_id uuid,
    player_name text,
    side text,
    language text,
    quantity integer,
    exclusive_trade_id bigint,
    is_mine boolean
  )
  language sql stable security definer set search_path = ''
  as $$
    with has_rows as (
      select t.tcg_account_id,
        case when (select auth.uid()) is not null then public.trade_account_name(t.tcg_account_id) end as player_name,
        'has'::text as side, t.language, t.quantity, e.id as exclusive_trade_id,
        exists (select 1 from public.player_tcg_account a
                where a.tcg_account_id = t.tcg_account_id and a.user_id = (select auth.uid())) as is_mine
      from public.cards_available_for_trade t
      left join public.exclusive_trade e on e.trade_card_id = t.id
      where t.card_id = p_card
      order by is_mine, player_name, t.language, t.tcg_account_id
      limit 200
    ), wants_rows as (
      select w.tcg_account_id,
        case when (select auth.uid()) is not null then public.trade_account_name(w.tcg_account_id) end as player_name,
        'wants'::text as side, w.language, w.quantity, null::bigint as exclusive_trade_id,
        exists (select 1 from public.player_tcg_account a
                where a.tcg_account_id = w.tcg_account_id and a.user_id = (select auth.uid())) as is_mine
      from public.wishlist w
      where w.card_id = p_card
      order by is_mine, player_name, w.language, w.tcg_account_id
      limit 200
    ), players as (
      select * from has_rows
      union all
      select * from wants_rows
    )
    select p.tcg_account_id, p.player_name, p.side, p.language,
      p.quantity, p.exclusive_trade_id, p.is_mine
    from players p
    order by p.is_mine, p.player_name, p.language, p.tcg_account_id, p.side;
  $$;


-- Browse all listings, searching the offered card or any wanted card's name
create function public.market_exclusive_trades(
  p_search text default '', p_limit integer default 50, p_offset integer default 0
)
  returns table (
    exclusive_trade_id bigint,
    owner_account uuid,
    owner_name text,
    card jsonb,
    language text,
    want_language text,
    want_cards jsonb,
    created_at timestamptz,
    is_mine boolean,
    total_count bigint
  )
  language sql stable security definer set search_path = ''
  as $$
    with search as (
      select btrim(replace(replace(coalesce(p_search, ''), '%', ''), '_', '')) as term
    )
    select e.id, t.tcg_account_id,
      case when (select auth.uid()) is not null then public.trade_account_name(t.tcg_account_id) end,
      to_jsonb(c), t.language, e.want_language,
      coalesce((
        select jsonb_agg(to_jsonb(wc) order by wc.card_local_id)
        from public.exclusive_trade_want w
        join public.card wc on wc.card_id = w.card_id
        where w.exclusive_trade_id = e.id
      ), '[]'::jsonb),
      e.created_at,
      exists (select 1 from public.player_tcg_account a
              where a.tcg_account_id = t.tcg_account_id and a.user_id = (select auth.uid())),
      count(*) over ()
    from public.exclusive_trade e
    join public.cards_available_for_trade t on t.id = e.trade_card_id
    join public.card c on c.card_id = t.card_id
    cross join search s
    where s.term = ''
      or c.card_name ilike '%' || s.term || '%'
      or c.card_local_id ilike '%' || s.term || '%'
      or exists (
        select 1 from public.exclusive_trade_want w
        join public.card wc on wc.card_id = w.card_id
        where w.exclusive_trade_id = e.id
          and wc.card_name ilike '%' || s.term || '%'
      )
    order by e.created_at desc, e.id desc
    limit greatest(1, least(coalesce(p_limit, 50), 100))
    offset greatest(coalesce(p_offset, 0), 0);
  $$;


revoke all on function public.market_card_counts() from public;
revoke all on function public.market_card_players(uuid) from public;
revoke all on function public.market_exclusive_trades(text, integer, integer) from public;
grant execute on function public.market_card_counts() to anon, authenticated;
grant execute on function public.market_card_players(uuid) to anon, authenticated;
grant execute on function public.market_exclusive_trades(text, integer, integer) to anon, authenticated;
