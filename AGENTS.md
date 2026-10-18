# Project rules

`AGENTS.md` is a copy of this file for Codex and other agents. Keep the two identical: whenever you change one, copy it over the other in the same commit.

This app will be used by many real users. Keep dev tooling out of production builds, keep user-facing text written for users, and treat Supabase Row Level Security as the real security boundary (the anon key ships in the page). Draft RLS policies are in `supabase/rls-policies.sql`.

## Where code goes
- `src/routes/` is only for real pages (each file there becomes a URL): `__root.tsx`, `index.tsx`, `updates.tsx`, `support.tsx`, `about.tsx`.
- Everything else (screens shown inside a page, menus, cards, forms) goes in `src/components/`.

## Text and translations
The app is meant to support several languages.
- On-screen text goes in `src/i18n/en.ts` under a descriptive key and is read with `useLocalizationStore().t.someKey`. Don't hard-code new user-facing text in components.
- To add a language: copy `en.ts` (e.g. `es.ts`), translate the values, register it in `src/i18n/index.ts`.
- Internal identifiers (list types, menu modes, card categories, "Any") live in `src/constants.ts` and are never translated. Never compare against translated text in logic.

## Payments (support page)
- Contributions are only recorded by the `stripe-webhook` Edge Function after Stripe confirms a payment. Never write to `contributions` from the browser, and never trust amounts sent by the client.
- Money is stored in pence (integers). Format with `formatPence` from `src/utils/money.ts`.
- Use Stripe test mode (`sk_test_...`) while developing. Setup steps are in `supabase/support.sql` and the two function files.

## Card data
- Card data (sets, cards, rarities) comes from the flibustier/pokemon-tcg-pocket-database dataset (MIT, up to date). The `sync-cards` Edge Function runs monthly (pg_cron, see `supabase/card-sync.sql`), adds new sets/cards, never deletes, and skips promo sets. Cards both sources have keep TCGdex's name. Don't hand-edit card data that the sync owns.
- Pictures: TCGdex when it has the card (`card_image` = TCGdex base URL). For cards TCGdex doesn't have yet, the sync (and the one-off `npm run mirror:dataset-images`) copies the dataset's release picture into the public Storage bucket `card-images` as `dataset/<SET>/<NNN>/low.webp` + `high.webp` and stores `card_image = 'storage:dataset/<SET>/<NNN>'`; `cardImageUrl` resolves that against the current Supabase. When TCGdex later adds the picture, the sync switches the card back to TCGdex. The dataset release zip is read with HTTP range requests (`supabase/functions/_shared/dataset-images.mjs`), never downloaded whole.
- Dev only: `npm run mirror:card-images` copies TCGdex pictures into local Storage and `VITE_CARD_IMAGES_FROM_STORAGE=true` in `.env.development.local` loads them from there (TCGdex fallback). The live bucket also holds a TCGdex copy (unused unless that flag is set for production).
- No untradeable rarities: **Three Star** (Immersive Rare) and **Crown** cards can't be traded in the game, so the site doesn't carry them. The sync skips those rarities (cards and rarity rows), `UNTRADEABLE_RARITIES` in `src/constants.ts` filters them out of rarity dropdowns, and migration `20261018000800_remove_untradeable_rarities.sql` removed the existing ones. If another rarity becomes untradeable, add it to both lists and remove its cards with a migration.
- Never hard-code set or rarity lists in the UI; build them from the `set` / `rarity` tables (`src/utils/searchOptions.ts`).
- Render card pictures with `CardPicture` (placeholder when there is none). List pictures are lazy-loaded; the high-resolution picture is only requested when the zoom opens.

## Branches
- Work happens on `dev`; commits are pushed to `origin/dev`.
- `master` is the release branch (it may auto-deploy to the live site). Only merge `dev` into `master` when the user asks for a release.
- Netlify (site `oaktrade`, live at https://oaktrade.miguelsalvador.co.uk; oaktrade.netlify.app also works) builds `master` with Yarn 4, which refuses to install when `yarn.lock` is out of date. After adding, removing or upgrading a dependency, run `yarn install` and commit `yarn.lock` too (npm only updates `package-lock.json`).
- Email: Supabase Auth sends sign-in emails through Resend SMTP (`smtp.resend.com`, sender `login@miguelsalvador.co.uk`), and `recover-username` uses the Resend API (secrets `RESEND_API_KEY`, `FROM_EMAIL`, `SITE_URL`). The domain's DNS (Netlify DNS) has Resend's DKIM (`resend._domainkey`), `send`/`rsend` CNAMEs and a DMARC record - don't remove them.
- `public/_redirects` sends every path to `index.html` so links like `/updates` work on Netlify; keep it.

## Log every update on the Updates page
Every change that affects the site or how it is run gets an article on the `/updates` page, in the same commit.

1. Add an entry at the **top** of the `updates` array in `src/updates/updates.ts` (newest first): `id` (kebab-case), `date` (YYYY-MM-DD), `audience`, `title`, one-sentence `summary`, a few short `body` paragraphs, and `tags`.
   - `audience: 'user'` for anything people using the site will notice. Write it for them: plain language, what changed for them, no file names, code or tooling.
   - `audience: 'dev'` for tooling, scripts, config and internal changes. These only show while running the dev server. Technical detail is fine here.
   - A change with both sides (e.g. a user-visible fix with notable internals) gets one `user` entry and one `dev` entry.
2. If the change is visible in the UI, add a screenshot of the area that changed:
   - Start the dev server (`npx vite --port 3005 --strictPort` works even when 3000 is taken).
   - Run `node scripts/screenshot.mjs <route> public/updates/<id>.png [css-selector]` with `BASE_URL=http://localhost:3005`. Pass a selector to crop to just the changed area. In Git Bash, prefix with `MSYS_NO_PATHCONV=1` so the route isn't turned into a file path.
   - Look at the image before using it, then set `screenshot: '/updates/<id>.png'` on the entry.
   - Stop the dev server afterwards.
3. Changes with nothing to show (tooling, scripts, config) still get an article, just without a screenshot.

## Click IDs and the click log
Most menus are opened through Zustand store flags (e.g. `setShowManageCardsMainMenu`), not URLs, so they can't be linked to directly. Instead, every clickable element has a unique `data-click-id="Component/what-it-is"` (e.g. `ManageCardsMainMenu/add-cards`), and in dev `src/dev/clickRecorder.ts` logs each click by that id (toggle in `src/dev/clickLogConfig.ts`).

- When the user pastes a click journey (from `copy(clickPath())`), grep `src/` for each id to find the exact element and handler.
- Steps marked `(untagged)` are clicks on elements without an id; give them one if they are interactive.
- **Every new clickable element (button, link, input, select, clickable div...) must get a unique `data-click-id`.** Use a template string for repeated items, e.g. ``data-click-id={`Comp/item:${id}`}``. Add `data-click-context` on a container to label clicks inside it (e.g. which card).

## Admin hub (`/admin`)
- Only accounts in `public.admin_users` whose session passed two-factor sign-in (authenticator app, Supabase Auth MFA, `aal2`) can use it. The database enforces this: every `admin_*` function starts with `if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'`; the page only decides what to show. Add an admin with `supabase/admin-setup.sql`.
- New admin features follow the same pattern: a `security definer` function with `set search_path = ''`, revoked from `public, anon`, granted to `authenticated`, checking `is_admin()` first, and writing a readable row to `public.admin_log` for every change.
- The admin code lives in `src/components/admin/` and is lazy-loaded by `src/routes/admin.tsx`, so regular visitors never download it.
- A permanent ban is `banned_until = now() + 100 years`, never `'infinity'` (Supabase Auth can't read it and every sign-in for that user fails).
