-- Run as the database owner in the SQL Editor, after the admin migration.
-- Grant membership to an existing account (replace the email first).
-- Membership alone grants no admin data: the session must also verify TOTP (aal2).
insert into public.admin_users (user_id)
select id from auth.users where email = 'you@example.com'
on conflict (user_id) do nothing;

-- Remove access:
-- delete from public.admin_users
-- where user_id in (select id from auth.users where email = 'you@example.com');

-- Manual card sync uses the schedule's sync_cards_secret Vault secret.
-- The schedule SQL has a placeholder project URL rather than a URL secret;
-- configure project_url as well (base URL only, no /functions/v1 suffix):
-- select vault.create_secret('https://YOUR-PROJECT.supabase.co', 'project_url');
-- select vault.create_secret('YOUR-SYNC-SECRET', 'sync_cards_secret');
-- Use vault.update_secret for an existing named secret instead of adding duplicates.
