-- =============================================================================
-- Reprint and variant details for cards - run once in the Supabase SQL Editor
-- (NOT YET APPLIED). The sync-cards function fills these in.
-- =============================================================================

-- Card this one re-uses the artwork of, e.g. 'B2-120' for a Deluxe Pack reprint
alter table public.card add column if not exists reprint_of text;

-- Special version of the card, e.g. 'parallel_foil'; null for the normal version
alter table public.card add column if not exists variant text;
