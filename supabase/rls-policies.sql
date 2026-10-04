-- =============================================================================
-- Row Level Security policies - DRAFT, NOT YET APPLIED
-- =============================================================================
-- The Supabase anon key ships in the page, so anyone can call these tables
-- directly, skipping the app. RLS is what actually stops one user reading or
-- changing another user's data.
--
-- Written from the queries the app makes today (2026-10-04). Before running:
--   1. Check each table's real columns in the Supabase Table Editor - in
--      particular that user_id is a uuid holding auth.users.id.
--   2. Run it on a staging/branch project first if you have one.
--   3. Run it in the SQL Editor, then click through the app signed in as a
--      normal user: sign up, set username, add TCG accounts, search cards.
--
-- With RLS on, anything without a matching policy is DENIED. That is the goal,
-- but it also means a forgotten policy shows up as "no rows" / a 401-403 error.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Card catalogue: card, rarity, set
-- Everyone (signed in or not) can read; nobody can write from the app.
-- Edit these through the dashboard / service role only.
-- -----------------------------------------------------------------------------
alter table public.card   enable row level security;
alter table public.rarity enable row level security;
alter table public.set    enable row level security;

create policy "Catalogue is readable by everyone"
  on public.card for select to anon, authenticated using (true);

create policy "Rarities are readable by everyone"
  on public.rarity for select to anon, authenticated using (true);

create policy "Sets are readable by everyone"
  on public.set for select to anon, authenticated using (true);


-- -----------------------------------------------------------------------------
-- user_account: each user can read and update only their own profile.
-- App queries: select own row (Account, UsernameDialog), update own
-- last_logged_in / username.
--
-- Insert: the app creates the row itself when an account has none yet (the
-- "Choose your username" screen), so users may insert their own row only.
-- No delete policy.
--
-- NOTE: UsernameDialog also runs `select username from user_account` (all
-- users). Its result is not used - duplicates and banned words are already
-- rejected by the database on update - so it will simply return only the
-- user's own row once this is on. It can be removed from the app.
-- If a public profile page is added later (e.g. trade partners seeing
-- usernames), expose just the needed columns through a view or RPC rather than
-- opening this table: it holds discord_id, email_updates, etc.
-- -----------------------------------------------------------------------------
alter table public.user_account enable row level security;

create policy "Users can read their own account"
  on public.user_account for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can create their own account row"
  on public.user_account for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own account"
  on public.user_account for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- player_tcg_account: each user manages only their own TCG accounts.
-- App queries: select own (ManageCardsMainMenu), insert own (ManageTCGAccountsMenu).
-- -----------------------------------------------------------------------------
alter table public.player_tcg_account enable row level security;

create policy "Users can read their own TCG accounts"
  on public.player_tcg_account for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can add their own TCG accounts"
  on public.player_tcg_account for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can update their own TCG accounts"
  on public.player_tcg_account for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users can delete their own TCG accounts"
  on public.player_tcg_account for delete to authenticated
  using (user_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- banned_words: signed-in users can read (the username dialog loads it).
--
-- IMPORTANT: the database check that rejects banned usernames reads this table.
-- If that trigger function is NOT `security definer`, it runs as the user, so
-- this select policy is what lets it see the words. Without it the check would
-- silently find nothing and allow every username.
-- -----------------------------------------------------------------------------
alter table public.banned_words enable row level security;

create policy "Signed-in users can read banned words"
  on public.banned_words for select to authenticated using (true);


-- -----------------------------------------------------------------------------
-- search_cards_filter (RPC used by the search bar)
-- Make sure it is `security invoker` (the default) so it obeys the policies
-- above, unless it deliberately needs more access. Check with:
--   select proname, prosecdef from pg_proc where proname = 'search_cards_filter';
-- prosecdef = true means security definer.
-- -----------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- Checks after applying
-- -----------------------------------------------------------------------------
-- Every table in public should have RLS on (rowsecurity = true):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
-- Any table not listed above (e.g. future trade / user card tables) needs its
-- own policies before the app uses it.
