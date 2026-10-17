-- Close private-data access exposed by inherited grants and permissive policies.
revoke all on function public.get_username_by_email(text) from public, anon, authenticated;
grant execute on function public.get_username_by_email(text) to service_role;

-- Trigger functions do not need to be callable through the public API.
alter function public.handle_new_user_account() set search_path = '';
revoke all on function public.handle_new_user_account() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function public.block_banned_usernames() from public, anon, authenticated;

drop policy if exists "insert" on public.friend;
drop policy if exists "Users can add their own friends" on public.friend;
create policy "Users can add their own friends"
  on public.friend for insert to authenticated
  with check (user_id = (select auth.uid()));
revoke all on public.friend from anon;

-- Leftover from the schema dump: this trigger made an empty user_account row whenever a banned word was inserted.
drop trigger if exists create_account_on_verification on public.banned_words;
