-- Species aliases are separate from the card-sync-owned catalogue. Future cards
-- automatically match existing species aliases, including Mega/regional/ex cards.
CREATE TABLE public.pokemon_search_name (
  english_name text NOT NULL,
  alias text NOT NULL,
  PRIMARY KEY (english_name, alias)
);
ALTER TABLE public.pokemon_search_name ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pokemon_search_name FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pokemon_search_name TO anon, authenticated;
GRANT ALL ON public.pokemon_search_name TO service_role;
CREATE POLICY "Species search names are public" ON public.pokemon_search_name
  FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.search_cards_filter(
  p_search_string text DEFAULT '', p_rarity text DEFAULT 'any', p_set text DEFAULT 'any'
) RETURNS TABLE (
  card_id uuid, card_image text, card_local_id text, card_name text,
  rarity_id uuid, rarity_name varchar, set_id uuid, set_name varchar, score bigint
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  WITH query AS MATERIALIZED (
    SELECT array_remove(regexp_split_to_array(
      lower(translate(normalize(trim(coalesce(p_search_string, '')), NFKC), '’‘', '''''')), '\s+'
    ), '') AS words
  ),
  -- Only consider translations relevant to this query, once per request.
  aliases AS MATERIALIZED (
    SELECT n.english_name, n.alias
    FROM public.pokemon_search_name n, query q
    WHERE EXISTS (
      SELECT 1 FROM unnest(q.words) search_word,
        unnest(regexp_split_to_array(n.alias, '\s+')) alias_word
      WHERE starts_with(alias_word, search_word)
    )
  ),
  cards AS (
    SELECT c.*, r.name AS rarity_name, s.set_name,
      ' ' || lower(translate(normalize(coalesce(c.card_name, ''), NFKC), '’‘', '''''')) || ' ' AS search_name
    FROM public.card c
    LEFT JOIN public.rarity r ON r.rarity_id = c.rarity_id
    LEFT JOIN public."set" s ON s.set_id = c.set_id
    WHERE (lower(trim(coalesce(p_rarity, 'any'))) = 'any' OR lower(r.name) = lower(trim(p_rarity)))
      AND (lower(trim(coalesce(p_set, 'any'))) = 'any' OR lower(s.set_name) = lower(trim(p_set)))
  )
  SELECT c.card_id, c.card_image, c.card_local_id, c.card_name,
    c.rarity_id, c.rarity_name, c.set_id, c.set_name, cardinality(q.words)::bigint AS score
  FROM cards c CROSS JOIN query q
  WHERE cardinality(q.words) = 0 OR EXISTS (
    -- Each spelling is a separate candidate: keep modifiers such as ex/Mega,
    -- and require every query word to match within the same candidate.
    SELECT 1 FROM (
      SELECT c.search_name AS name
      UNION ALL
      SELECT replace(c.search_name, ' ' || a.english_name || ' ', ' ' || a.alias || ' ')
      FROM aliases a
      WHERE strpos(c.search_name, ' ' || a.english_name || ' ') > 0
    ) variant
    WHERE NOT EXISTS (
      SELECT 1 FROM unnest(q.words) search_word
      WHERE NOT EXISTS (
        SELECT 1 FROM unnest(regexp_split_to_array(trim(variant.name), '\s+')) card_word
        WHERE starts_with(card_word, search_word)
      )
    )
  )
  ORDER BY score DESC, c.card_name ASC;
$$;

REVOKE ALL ON FUNCTION public.search_cards_filter(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_cards_filter(text, text, text) TO anon, authenticated, service_role;
