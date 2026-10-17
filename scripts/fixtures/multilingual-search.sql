CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE TABLE public.rarity (rarity_id uuid PRIMARY KEY, name varchar);
CREATE TABLE public."set" (set_id uuid PRIMARY KEY, set_name varchar, set_code text);
CREATE TABLE public.card (
  card_id uuid DEFAULT gen_random_uuid() PRIMARY KEY, card_image text,
  card_local_id text, card_name text, rarity_id uuid, set_id uuid
);
INSERT INTO public.rarity VALUES ('00000000-0000-0000-0000-000000000001', 'One Diamond'), ('00000000-0000-0000-0000-000000000002', 'Four Diamond');
INSERT INTO public."set" VALUES ('00000000-0000-0000-0000-000000000001', 'Genetic Apex', 'A1'), ('00000000-0000-0000-0000-000000000002', 'Other set', 'A2');
INSERT INTO public.card (card_local_id, card_name, rarity_id, set_id)
SELECT id, name, ('00000000-0000-0000-0000-00000000000' || rarity)::uuid,
  ('00000000-0000-0000-0000-00000000000' || expansion)::uuid
FROM (VALUES
  ('A1-001', 'Bulbasaur', '1', '1'),
  ('other-001', 'Bulbasaur', '1', '2'),
  ('A1-004', 'Venusaur ex', '2', '1'),
  ('A1-035', 'Charizard ex', '2', '1'),
  ('mega-001', 'Mega Charizard ex', '2', '2'),
  ('farfetchd', 'Farfetch''d', '1', '1'),
  ('mime', 'Mr. Mime', '1', '1'),
  ('mew', 'Mew', '1', '1'),
  ('mewtwo', 'Mewtwo', '1', '1'),
  ('trainer', 'Professor''s Research', '1', '1')
) fixture(id, name, rarity, expansion);
ALTER TABLE public.card ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rarity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."set" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read cards" ON public.card FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Read rarities" ON public.rarity FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Read sets" ON public."set" FOR SELECT TO anon, authenticated USING (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.card, public.rarity, public."set" TO anon, authenticated;
