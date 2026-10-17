SET ROLE anon;
DO $$
DECLARE term text;
BEGIN
  FOREACH term IN ARRAY ARRAY['Bulbasaur', 'bulb', 'フシギダネ', 'フシギダ', 'ﾌｼｷﾞﾀﾞﾈ', 'Fushigidane', 'Bulbizarre', 'Bisasam', '이상해씨', '妙蛙種子', '妙蛙种子'] LOOP
    IF (SELECT count(*) FROM public.search_cards_filter(term)) <> 2 THEN
      RAISE EXCEPTION 'Expected both Bulbasaur cards for %', term;
    END IF;
    IF EXISTS (SELECT 1 FROM public.search_cards_filter(term) WHERE card_name <> 'Bulbasaur') THEN
      RAISE EXCEPTION 'Incorrect species for %', term;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.search_cards_filter('フシギダネ', 'One Diamond', 'Genetic Apex')) <> 1 THEN
    RAISE EXCEPTION 'Set/rarity filters failed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_cards_filter('フシギダネ', 'Four Diamond')) THEN
    RAISE EXCEPTION 'Rarity filter ignored';
  END IF;
  IF (SELECT card_name FROM public.search_cards_filter('フシギバナ ex')) IS DISTINCT FROM 'Venusaur ex' THEN
    RAISE EXCEPTION 'Japanese species + ex failed';
  END IF;
  IF (SELECT card_name FROM public.search_cards_filter('mega dracaufeu ex')) IS DISTINCT FROM 'Mega Charizard ex' THEN
    RAISE EXCEPTION 'Mega + French species + ex failed';
  END IF;
  IF (SELECT count(*) FROM public.search_cards_filter('ex リザードン')) <> 2 THEN
    RAISE EXCEPTION 'Reordered query words failed';
  END IF;
  IF (SELECT card_name FROM public.search_cards_filter('カモネギ')) IS DISTINCT FROM 'Farfetch''d' THEN
    RAISE EXCEPTION 'Apostrophe species failed';
  END IF;
  IF (SELECT card_name FROM public.search_cards_filter('バリヤード')) IS DISTINCT FROM 'Mr. Mime' THEN
    RAISE EXCEPTION 'Multiword English species failed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_cards_filter('ミュウtwo')) THEN
    RAISE EXCEPTION 'Translation accidentally matched an English substring (Mewtwo)';
  END IF;
  IF (SELECT card_name FROM public.search_cards_filter('prof res')) IS DISTINCT FROM 'Professor''s Research' THEN
    RAISE EXCEPTION 'Existing English word-prefix search failed';
  END IF;
  IF (SELECT count(*) FROM public.search_cards_filter('')) <> 10
    OR (SELECT count(*) FROM public.search_cards_filter(NULL, NULL, NULL)) <> 10 THEN
    RAISE EXCEPTION 'Empty/null search failed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_cards_filter('フシギダネ ex'))
    OR EXISTS (SELECT 1 FROM public.search_cards_filter('bulbasaur xyz'))
    OR EXISTS (SELECT 1 FROM public.search_cards_filter('%')) THEN
    RAISE EXCEPTION 'Unmatched query returned cards';
  END IF;
  BEGIN
    INSERT INTO public.pokemon_search_name VALUES ('fake', 'fake');
    RAISE EXCEPTION 'Anonymous writes allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
SET ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.search_cards_filter('フシギダネ')) <> 2 THEN
    RAISE EXCEPTION 'Authenticated search failed';
  END IF;
  BEGIN
    DELETE FROM public.pokemon_search_name;
    RAISE EXCEPTION 'Authenticated writes allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;
-- A matching card hidden by card RLS must never leak through the search RPC.
INSERT INTO public.card (card_local_id, card_name) VALUES ('hidden', 'Bulbasaur');
DROP POLICY "Read cards" ON public.card;
CREATE POLICY "Read cards" ON public.card FOR SELECT TO anon, authenticated
  USING (card_local_id <> 'hidden');
SET ROLE anon;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.search_cards_filter('フシギダネ')) <> 2 THEN
    RAISE EXCEPTION 'Search leaked a card hidden by RLS';
  END IF;
END $$;
RESET ROLE;
DELETE FROM public.card WHERE card_local_id = 'hidden';
DO $$ BEGIN
  IF (SELECT prosecdef FROM pg_proc WHERE oid = 'public.search_cards_filter(text,text,text)'::regprocedure) THEN
    RAISE EXCEPTION 'Search must obey caller RLS';
  END IF;
END $$;
SELECT 'PASS: multilingual names, prefixes, modifiers, filters, no duplicates, English regression, public read-only access and invoker security' AS result;
