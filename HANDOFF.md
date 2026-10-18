# Handoff: Oaktrade (state on 2026-10-18)

Read `AGENTS.md` first: it holds the project rules (i18n, click IDs, Updates articles, card data, admin hub, branches). This file is the current state and how to keep working.

## What the site is
Oaktrade (https://oaktrade.miguelsalvador.co.uk, also oaktrade.netlify.app) is a Pokémon TCG Pocket trading site: React + Vite + TanStack Router + Mantine + Zustand on Netlify, Supabase (Postgres + Auth + Storage + Edge Functions) behind it.

Main features, all live:
- **Sign-in:** email code (8 digits on live, 6 locally; the code box accepts 6–10).
- **Usernames:** the first choice is free; after that one change every 30 days. Admins can always rename.
- **Pocket accounts:** a user owns several. Each has its own wishlist, trade list, exclusive trades and offers. They're managed on the Pocket accounts screen in Manage cards.
- **Trades:** Find trades, offers (send, accept, decline, cancel, both sides mark done) and notifications.
- **Exclusive trades:** a picture-grid picker for the cards you'd take, and a market tab with Set/Rarity filters plus "only answerable" and "only on my wishlist" switches.
- **Home card market:** who has or wants each card, a Friends only switch, and search by translated Pokémon names.
- **Trade matches:** a pop-up after adding cards, plus a `trade_match` notification for the other player, at most once per pair of Pocket accounts per day.
- **Friends:** request and accept, friend IDs with copy, a friend's cards with "Make an offer", Friends only filters, and friend notifications.
- **Admin hub at `/admin`:** email sign-in plus an authenticator app (aal2), enforced in the database. Tabs: overview, sign-ins, users (rename, ban, sign out, delete), trades, banned words, card sync, activity log.
- **Paused:** the Support page (`SUPPORT_PAGE_ENABLED = false`) and the new-expansions banner (`NEW_SET_BANNER_ENABLED = false`), both in `src/constants.ts`.
- **Removed:** Three Star (Immersive Rare) and Crown cards (untradeable). They're kept out by the sync and by `UNTRADEABLE_RARITIES`.

## Infrastructure
| Thing | Where |
|---|---|
| Live site | Netlify site `oaktrade`, builds `master` with Yarn 4 (keep `yarn.lock` current: run `yarn install` after any dependency change) |
| Database / auth | Supabase project `xxtbgyxfxcisfugzizys` (Frankfurt, free plan; pauses after ~7 days without activity, restore it in the dashboard) |
| Edge Functions on live | `sync-cards` (monthly), `recover-username` (Resend). `create-checkout` / `stripe-webhook` are NOT deployed (support paused). `fetch-posts` is an old unused function |
| Email | Resend, domain `miguelsalvador.co.uk` (DNS in Netlify DNS: `resend._domainkey` TXT, `send`/`rsend` CNAMEs, `_dmarc`). Supabase Auth SMTP = `smtp.resend.com:465`, user `resend`, sender `login@miguelsalvador.co.uk`. Templates "Confirm sign up" and "Magic link or OTP" both contain `{{ .Token }}` |
| Card pictures | TCGdex when available; otherwise Storage bucket `card-images` (`card_image = 'storage:dataset/<SET>/<NNN>'`). Live bucket also holds an unused ~200 MB TCGdex copy (safe to delete) |
| Local dev | `npm run dev` (port 3000), local Supabase via Docker (`npx supabase start`), Mailpit http://127.0.0.1:54324 for sign-in codes. `.env.development.local` points the dev server at local Supabase |

## Releasing (the order matters)
1. Work on `dev`, commit, push `origin dev`. Only release when the owner asks.
2. **Database first.** Run `npx supabase db push --linked --dry-run`, then `npx supabase db push --linked --yes`. The CLI is linked to the live project and logged in on this PC.
3. **Then the site:** `git push origin dev:master` (a fast-forward), then watch the Netlify deploy.
4. Edge Functions: `npx supabase functions deploy <name> --project-ref xxtbgyxfxcisfugzizys` (`recover-username` needs `--no-verify-jwt`).

## Gotchas learned the hard way
- **Migration numbers must be unique.** Supabase tracks migrations by number alone, so a duplicate is silently skipped on live. Two sessions once both used `20261018000600`. Check `ls supabase/migrations` and take the next number (the latest is `20261018001000`).
- **Never edit applied migrations.** Add a new one. Migrations run on live without a wrapping transaction, so `LOCK TABLE` fails there.
- **Usernames:** the trigger `trg_block_banned_usernames` fires on every update, and `username_changed_at` is set by the trigger, never by the client.
- **Notification bell query:** `notification` has several foreign keys to `player_tcg_account`, so the account relation must be written as `player_tcg_account!notification_tcg_account_id_fkey`.
- **Bans:** a permanent ban is `now() + 100 years`, never `'infinity'`.
- **Click IDs:** keep existing `data-click-id`s; Codex renamed some once and they had to be restored.
- **Windows ports:** Hyper-V/winnat sometimes reserves ports 54321–54420, which stops local Supabase starting. Fix, in an administrator PowerShell: `net stop winnat`, `npx supabase start`, `netsh int ipv4 add excludedportrange protocol=tcp startport=54320 numberofports=10`, `net start winnat`.
- **Codex sandbox:** it can't reach the internet outside the repo, can't use the Supabase CLI login, and Vite can't write its cache through junctioned `node_modules`. Run live-site tests and CLI deploys from a normal shell.
- **Type errors:** the typecheck baseline is 58 errors (`npx tsc --noEmit -p .`), all old ones. Don't add new ones.

## Test data (local database only)
TestAsh `ash@test.local`, TestMisty `misty@test.local`, QA-One `qa1@test.local` (local admin, authenticator already set up), QA-Two `qa2@test.local`, plus the owner's account `miguelsalvadorstudios@gmail.com`. Sign-in codes arrive in Mailpit. Signing in is on the `/login` page.

## Open items / ideas
- **Owner admin on live:** run `supabase/admin-setup.sql` in the live SQL Editor with the owner's email, then set up the authenticator at `/admin`.
- **Admin "Run card sync now":** needs Vault secrets `project_url` and `sync_cards_secret` on live (see `supabase/admin-setup.sql`).
- **Support/payments:** to turn back on, apply `supabase/support.sql`, deploy `create-checkout` + `stripe-webhook`, set the Stripe keys, and set `SUPPORT_PAGE_ENABLED = true`.
- **Old empty accounts:** six accounts from 2026-01-23 on live have no email or cards. Delete them if wanted; the admin hub needs the email to confirm a delete, so use SQL or the Auth admin API.
- **Account switcher:** a page refresh while in "Add another account" mode cancels that mode. Minor; it could be persisted.
- **Unused `public.friend` table:** this older table is unused; friendships live in `public.friendship`.
- **Not tested on live by a signed-in user:** the trade-match pop-up, the new exclusive-trade picker, the Friends only switches, and the 30-day username rule. All were tested locally.
