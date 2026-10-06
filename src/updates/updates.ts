// Every change gets an entry here (newest first).
// audience 'user': shown to everyone - write it for people using the site, no code or tooling talk.
// audience 'dev':  developer tooling/internal changes - only shown while running the dev server.
// Screenshots live in public/updates/ - capture them with:
//   node scripts/screenshot.mjs <route> public/updates/<id>.png [css-selector]

export type Update = {
  id: string;
  date: string; // YYYY-MM-DD
  audience: 'user' | 'dev';
  title: string;
  summary: string;
  body: string[];
  screenshot?: string; // path under public/, e.g. /updates/my-update.png
  tags?: string[];
};

export const updates: Update[] = [
  {
    id: 'set-dropdown-no-stale-list',
    date: '2026-10-06',
    audience: 'dev',
    title: 'Set and rarity filters: no hard-coded lists left',
    summary: 'The store fallbacks for the rarity/set dropdowns are now just "Any" instead of a typed list that had stopped at Crimson Blaze.',
    body: [
      'The dropdowns are built from the set / rarity tables (expansionOptions / rarityOptions), so they include every set the card sync adds; checked against the live database: 14 sets ending with Fantastical Parade and Paldean Wonders, and a search filtered to Fantastical Parade returns its cards.',
    ],
    tags: ['data'],
  },
  {
    id: 'auto-card-updates',
    date: '2026-10-05',
    audience: 'user',
    title: 'New expansions arrive automatically',
    summary: 'New card sets are now added to the site automatically each month, and all rarities can be searched.',
    body: [
      "When a new expansion comes out, its cards are added for you, with a banner at the top of the site and an article here. Cards whose pictures aren't available yet show \"Picture coming soon\" until they are.",
      'The search filters now list every set and every rarity, including Three Star and Crown, which were missing before.',
    ],
    screenshot: '/updates/new-set-banner.png',
    tags: ['new'],
  },
  {
    id: 'auto-card-updates-dev',
    date: '2026-10-05',
    audience: 'dev',
    title: 'sync-cards: monthly TCGdex card sync',
    summary: 'Edge Function that adds new Pocket sets/cards from TCGdex and refreshes existing ones; scheduled monthly with pg_cron.',
    body: [
      'Matches sets by set_code and cards by card_local_id (both made unique), rarities by name (new rarity names are inserted). Fetches rarities with one request per rarity per set instead of one per card (~160 requests, ~15 s). Never deletes, never overwrites a value with an empty one; logs each run in card_sync_runs; ?dryRun=1 reports changes without writing. A dry run against the live data on 2026-10-05: B2 and B2a to add (365 cards), 0 existing cards changed.',
      'UI: rarity/set filters built from the DB (src/utils/searchOptions.ts), CardPicture placeholder for missing pictures, NewSetBanner for sets added in the last 14 days (dismissible per set), and automatic "New expansion" articles on /updates from set.added_at.',
    ],
    tags: ['data'],
  },
  {
    id: 'card-buttons',
    date: '2026-10-05',
    audience: 'user',
    title: 'Cleaner card controls',
    summary: 'Cards in the add-cards list have a tidier layout, clearer buttons, and work properly on phones.',
    body: [
      'Each card now shows its picture with the name and controls beside it: a - / + quantity stepper, the language choice for trade cards, and a clear "Add to Selected" button. The card you tap is outlined in blue.',
      'Choosing a language for a card now actually saves it (before, it was ignored), the language list opens on the first tap, and Next no longer takes you past the last page.',
    ],
    screenshot: '/updates/card-buttons.png',
    tags: ['improvement', 'fix'],
  },
  {
    id: 'card-buttons-dev',
    date: '2026-10-05',
    audience: 'dev',
    title: 'PokeCard redesign and language bugs',
    summary: 'PokeCard rebuilt with Mantine (Group/Stack, ActionIcon stepper, Button); PokeList frames, pager and width cap.',
    body: [
      'Bugs fixed: Select onChange read e.value (Mantine passes the value) so language was always undefined; the per-card language Select was rendered twice and defined as a component inside PokeCard, so it remounted and closed when the card got selected; ManageCardsMainMenu called setManageCardsSelectedLanguage on the useStateStore hook instead of the store (crash); the category Select crashed when an option was deselected.',
      'PokeList: selected card is outlined (blue border + light background) instead of brown fill and scale; list capped at 760px; Previous/Next are Mantine buttons with "page / pages", disabled at the ends. Removed the stray storybook/theming import from PokeCard.',
    ],
    tags: ['ui', 'fix'],
  },
  {
    id: 'theme-toggle',
    date: '2026-10-05',
    audience: 'user',
    title: 'Dark mode by default, with one switch',
    summary: 'The site now opens in dark mode, and a single button at the top switches between dark and light.',
    body: [
      'The three Light / Dark / Auto buttons are now one sun or moon button. Press it to switch, and the site remembers your choice next time.',
      'If you had already picked light mode, nothing changes for you.',
    ],
    screenshot: '/updates/theme-toggle.png',
    tags: ['improvement'],
  },
  {
    id: 'theme-toggle-dev',
    date: '2026-10-05',
    audience: 'dev',
    title: 'Single colour-scheme toggle, dark default',
    summary: 'ColorSchemeToggle is one ActionIcon; MantineProvider defaultColorScheme="dark"; index.html sets the scheme before first paint.',
    body: [
      'The inline script in index.html reads mantine-color-scheme-value from localStorage (light / auto / dark, defaulting to dark) and sets data-mantine-color-scheme on <html> so there is no light flash on load.',
    ],
    tags: ['ui'],
  },
  {
    id: 'lighter-card-images',
    date: '2026-10-05',
    audience: 'user',
    title: 'Card pictures load faster',
    summary: 'Card pictures now use about a quarter of the data, which helps a lot on a weak phone signal.',
    body: [
      'Each card picture is now around 15 to 25 KB instead of about 60 KB, with no visible difference. A page of 10 cards went from roughly 600 KB to about 160 KB.',
      'Pictures also only load when they are about to come into view, and a grey placeholder keeps the page steady while they arrive.',
    ],
    tags: ['improvement'],
  },
  {
    id: 'lighter-card-images-dev',
    date: '2026-10-05',
    audience: 'dev',
    title: 'Card images: WebP, lazy loading, PNG fallback',
    summary: 'src/utils/cardImage.ts builds TCGdex low.webp URLs; PokeCard and ConfirmCardsList use loading="lazy" and fall back to low.png on error.',
    body: [
      'Measured: low.png ~56-69 KB vs low.webp ~15-24 KB per card. Use cardImageUrl(card.card_image) for any new card picture rather than building the URL by hand.',
    ],
    tags: ['performance'],
  },
  {
    id: 'support-page',
    date: '2026-10-04',
    audience: 'user',
    title: 'Help keep the site running',
    summary: 'A new Support page shows what it costs to run the site each month, and lets you chip in.',
    body: [
      "Open Support in the top menu to see this month's running costs filling up, what the money pays for, and upgrades we are saving for, like a faster server.",
      "You can give once or monthly, from £1, and choose which bar your money goes towards. Payment happens on Stripe's secure page. Signed-in supporters get a Supporter badge and can choose to appear in the thank-you list.",
    ],
    screenshot: '/updates/support-page.png',
    tags: ['new'],
  },
  {
    id: 'support-page-dev',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Support page with Stripe Checkout and webhook',
    summary: 'funding_goals / monthly_costs / contributions tables, create-checkout and stripe-webhook Edge Functions, /support route.',
    body: [
      'create-checkout validates amount (£1-£500), mode and goal, links the signed-in user via metadata, and returns a Stripe Checkout URL (subscription for monthly, payment otherwise). stripe-webhook verifies the signature and records checkout.session.completed (one-off) and invoice.paid (every monthly renewal) idempotently by Stripe object id; charge.refunded marks one-off payments refunded.',
      'The page reads the funding_progress and supporters_public views (totals and opted-in usernames only). Badge = my_supporter_status() (contributed in the last 35 days). Setup: run supabase/support.sql, set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET / SITE_URLS secrets, deploy both functions with --no-verify-jwt, add the webhook endpoint in Stripe. Optional VITE_STRIPE_PORTAL_URL for the manage/cancel link.',
    ],
    tags: ['payments'],
  },
  {
    id: 'sign-in-code',
    date: '2026-10-04',
    audience: 'user',
    title: 'Sign in with a code',
    summary: 'You can now sign in by typing the code from the email, which works on any device.',
    body: [
      'After you enter your email, the sign-in email contains both a link and a code. Tap the link on the same device, or type the code on the sign-in screen. The code is handy when you read your email on a different device, or when the link opens in your mail app instead of your browser.',
      'If a sign-in link has expired or was already used, the site now tells you, so you can send a new one.',
      'Already have a code from an earlier email? Enter your email and press "I already have a code" to type it in without sending a new email.',
    ],
    screenshot: '/updates/sign-in-code.png',
    tags: ['new'],
  },
  {
    id: 'sign-in-code-dev',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Email OTP code sign-in and magic-link error notice',
    summary: 'Auth.tsx verifies the emailed OTP with supabase.auth.verifyOtp; __root.tsx turns #error=... redirects into a notice.',
    body: [
      'Magic links redirect to the origin they were requested from, so a link requested on the PC (localhost) fails on a phone. The code path avoids redirects entirely. The Magic Link email template must include {{ .Token }} for the code to appear in the email.',
      'Failed links (e.g. error_code=otp_expired) are read from the URL hash before Supabase processes it, shown via the saved-accounts notice, and removed from the address bar. Send errors with status 429 show Supabase\'s rate-limit message. New text lives in src/i18n/en.ts.',
    ],
    tags: ['auth'],
  },
  {
    id: 'named-text-keys',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Named text keys and constants replace localizationArray',
    summary: 'On-screen text moved to src/i18n/en.ts with named keys; internal IDs moved to src/constants.ts.',
    body: [
      'useLocalizationStore now holds { language, t, setLanguage } instead of the numbered localizationArray, e.g. t.quantity instead of localizationArray[22]. Adding a language means copying en.ts and registering it in src/i18n/index.ts.',
      'Internal IDs that lived in the same array (list types, menu modes, "Any") are now LIST_TYPE, MENU_MODE and ANY_OPTION. The card-category dropdown stores CARD_CATEGORY.wishlist / .trade with translated labels, so logic no longer compares against display text (which would break once translated).',
    ],
    tags: ['structure', 'i18n'],
  },
  {
    id: 'components-out-of-routes',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Components moved out of src/routes',
    summary: 'Only real pages stay in src/routes; Header, Auth, Account, LandingPage, the card lists and menus moved to src/components.',
    body: [
      'Every file in src/routes becomes a URL with TanStack Router, so /Header, /pokeList/PokeCard and /managecards/ManageTCGAccountsMenu were reachable as pages (the accounts form even opened for logged-out visitors). They now return Not Found.',
      'Moved files lost their createFileRoute definitions; imports were updated and routeTree.gen.ts regenerated. The folder layout is the same under src/components (managecards/, pokeList/, reusableComponents/).',
    ],
    tags: ['structure'],
  },
  {
    id: 'tcg-accounts-form',
    date: '2026-10-04',
    audience: 'user',
    title: 'Adding your game accounts now works properly',
    summary: 'The form for adding your Pokémon TCG Pocket accounts has been rebuilt and is much easier to use.',
    body: [
      'Start with one account, and press "+ Add another account" if you have more. Each account needs a name and its ID (numbers only; spaces are fine).',
      'Mistakes are pointed out next to the field before anything is saved, and you only see a success message once your accounts really have been saved. You go straight on to managing your cards afterwards.',
    ],
    screenshot: '/updates/tcg-accounts-form.png',
    tags: ['fix'],
  },
  {
    id: 'tcg-accounts-form-dev',
    date: '2026-10-04',
    audience: 'dev',
    title: 'ManageTCGAccountsMenu rewritten',
    summary: 'The old form could not be typed in, saved placeholder values plus an extra empty row, and always reported success.',
    body: [
      'Old bugs: onChange replaced the whole array with one value, the row component was defined inside render (focus lost on every keystroke), the insert loop ran length+1 times, and "Accounts Created" showed regardless of errors.',
      'Now: rows with stable keys, per-field validation (required, digits only, no duplicate IDs), one bulk insert with tcg_id sent as text (16-digit IDs exceed JS number precision), and an onCreated callback that makes ManageCardsMainMenu reload its accounts.',
    ],
    tags: ['fix'],
  },
  {
    id: 'all-cards-load',
    date: '2026-10-04',
    audience: 'user',
    title: 'Every card is now available',
    summary: 'The card list now includes all 2,015 cards; before, about half were missing.',
    body: [
      'When adding cards, the list only showed the first 1,000 cards, so many newer cards could only be found by searching. All of them now appear.',
      'You also can no longer add a card with a quantity of 0: "Add to Selected" becomes available once you have chosen at least one copy.',
    ],
    tags: ['fix'],
  },
  {
    id: 'quick-fixes-dev',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Linux build fix, paged card loading, fewer DB writes',
    summary: 'Fixed import casing that broke Linux builds, loaded the catalogue past the 1000-row cap, and stopped writing last_logged_in on every render.',
    body: [
      'Five imports used the wrong letter case (uselocalizationStore, useStateStoreTYpe). Windows ignores case, but Netlify builds on Linux where they fail to resolve.',
      'src/utils/fetchAllRows.ts reads a table in 1000-row pages ordered by a stable column; LandingPage loads cards ordered by card_local_id (same order as before). Account.tsx writes last_logged_in once per signed-in user instead of on every render. The add button is disabled at quantity 0.',
    ],
    tags: ['fix'],
  },
  {
    id: 'confirm-cards-read-only',
    date: '2026-10-04',
    audience: 'user',
    title: 'Clearer card confirmation',
    summary: 'The confirmation window now lists your cards neatly, however many you add, so you can check them before confirming.',
    body: [
      'When you press "Add Cards to My Library", each card appears as a tidy row with its picture, name, quantity and language, plus a total at the top. Long lists scroll, and it fits on phones too.',
      'The cards in this window are just for checking: they can no longer be tapped, highlighted or changed by accident. Use "I want to change." to go back and edit them.',
    ],
    screenshot: '/updates/confirm-cards.png',
    tags: ['improvement'],
  },
  {
    id: 'confirm-cards-read-only-dev',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Confirm list check fixed in PokeList',
    summary: 'The confirm-list check read useLocalizationStoreWrapper[26] (always undefined) instead of .localizationArray[26].',
    body: [
      'PokeList now renders listConfirmAddCards items without the clickable wrapper and passes isCardSelected={false}, so no highlight, hover zoom or Add/Remove button. Each list item has its key on the <li> (fixes the "unique key" warning).',
      'Removed test content: the placeholder Mantine List in every card and <text>fsdfdsfsdfsdfsdf</text> in ManageCardsMainMenu (the "<text> is unrecognized" warning). PokeCard shows the language in the confirm list.',
      'The confirm modal now renders src/components/ConfirmCardsList (compact rows from listCardsSelected, scrolls past 55vh, no pagination) instead of PokeList, because PokeCard\'s fixed 1000x150 layout with a floated image overlapped when there was more than one card.',
    ],
    tags: ['fix'],
  },
  {
    id: 'switch-accounts',
    date: '2026-10-04',
    audience: 'user',
    title: 'Switch between accounts',
    summary: 'Use more than one account on the same device and switch between them in one click.',
    body: [
      'Click your name at the top right to see the accounts you have used on this device. Pick one to switch to it straight away, no new email needed.',
      'Choose "Add another account" to sign in to a new one; your current account stays saved. "Log out" signs you out and removes that account from this device.',
      'If an account has no username yet, you will be asked to choose one as soon as you switch to it.',
    ],
    screenshot: '/updates/switch-accounts.png',
    tags: ['new'],
  },
  {
    id: 'switch-accounts-dev',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Saved accounts store and username setup',
    summary: 'src/store/savedAccountsStore.ts remembers each signed-in account\'s tokens for switching; saveUsername creates missing profile rows.',
    body: [
      '__root.tsx saves every session (and every token refresh) into the saved-accounts list in localStorage; switching calls supabase.auth.setSession with that account\'s tokens. Accounts whose tokens fail are removed with a notice. Log out uses signOut({ scope: "local" }) so other devices stay signed in.',
      'LandingPage now shows a loader while the profile loads, then ChangeUsername in "set" mode when there is no username. saveUsername updates the user_account row or inserts it if missing, so the RLS draft gained an own-row insert policy. UsernameDialog is no longer used.',
    ],
    tags: ['auth'],
  },
  {
    id: 'change-username',
    date: '2026-10-04',
    audience: 'user',
    title: 'Change your username',
    summary: 'You can now pick a new username after signing in.',
    body: [
      'Once you are signed in, the home page shows a "Your username" box. Type a new name and press Save (or Enter).',
      'Names that are already taken or not allowed will be turned down with a message, so you can try another one.',
    ],
    screenshot: '/updates/change-username.png',
    tags: ['new'],
  },
  {
    id: 'change-username-dev',
    date: '2026-10-04',
    audience: 'dev',
    title: 'ChangeUsername component',
    summary: 'src/components/ChangeUsername updates user_account.username for the signed-in user and refreshes authStore.user.',
    body: [
      'Shown in Account.tsx. Relies on the existing database checks: "Username contains a banned word" and unique violations (23505) map to friendly messages. An update that matches no row reports a missing profile instead of failing silently.',
    ],
    tags: ['auth'],
  },
  {
    id: 'header-login',
    date: '2026-10-04',
    audience: 'user',
    title: 'Log in and Log out from the top menu',
    summary: 'The top-right corner now shows a working Log in button, or Manage Cards and Log out once you are signed in.',
    body: [
      'If you are not signed in, press Log in at the top right to go to the sign-in form.',
      'Once you are signed in, Manage Cards opens your card menu from any page, and Log out signs you out of this device.',
    ],
    screenshot: '/updates/header-login.png',
    tags: ['improvement'],
  },
  {
    id: 'header-login-dev',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Header auth state and profile loading',
    summary: 'The header uses session + username to decide what to show, and the profile now loads in the root layout.',
    body: [
      'isSignedIn = session && user.username. Log in / Manage Cards navigate to "/" (where the sign-in form and the Manage Cards menu live); Log out calls supabase.auth.signOut().',
      'useSupabaseSession() in __root.tsx now also fetches the user_account row when the session user changes and clears it on sign-out. Fixed Account.tsx storing the result array as the user, and the router type registration (the unused App.tsx re-declared it as typeof Router).',
    ],
    tags: ['auth'],
  },
  {
    id: 'recover-username',
    date: '2026-10-04',
    audience: 'user',
    title: 'Forgot your username? We can email it to you',
    summary: 'You can now get your username sent to the email address you signed up with.',
    body: [
      'On the sign-in screen, click "Forgot your username?", enter your email address and press "Email me my username".',
      'If an account uses that email, we will send its username there within a minute or two.',
    ],
    screenshot: '/updates/recover-username.png',
    tags: ['new'],
  },
  {
    id: 'recover-username-dev',
    date: '2026-10-04',
    audience: 'dev',
    title: 'recover-username Edge Function',
    summary: 'Username recovery runs in a Supabase Edge Function that emails the username via Resend.',
    body: [
      'supabase/functions/recover-username looks the username up with get_username_by_email (service-role only, see supabase/username-recovery.sql) and sends it with Resend. It always answers { ok: true } so it cannot be used to check which emails have accounts.',
      'Rate limited to 3 requests per email and 10 per IP per hour, stored as SHA-256 hashes in username_recovery_requests. Needs the SQL run, the RESEND_API_KEY / FROM_EMAIL / SITE_URL secrets set, and deploying with --no-verify-jwt.',
    ],
    tags: ['auth', 'email'],
  },
  {
    id: 'rls-draft-and-dev-branch',
    date: '2026-10-04',
    audience: 'dev',
    title: 'RLS policy draft and dev branch',
    summary: 'Draft Row Level Security policies for every table the app uses, and day-to-day work moves to the dev branch.',
    body: [
      'supabase/rls-policies.sql has draft policies (not applied): the card catalogue is public read-only, and user_account / player_tcg_account rows are only visible and editable by their owner.',
      'Commits now go to the dev branch; master is the release branch and is only updated when a release is made.',
    ],
    tags: ['security', 'tooling'],
  },
  {
    id: 'updates-audience',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Dev-only articles on the Updates page',
    summary: 'Updates are now marked for users or developers; developer articles only show in dev.',
    body: [
      'Each entry in src/updates/updates.ts has an audience. "user" articles are public; "dev" articles (tooling, internal changes) are hidden in the production build and shown with a "dev" badge while developing.',
    ],
    tags: ['tooling'],
  },
  {
    id: 'persistent-login',
    date: '2026-10-04',
    audience: 'user',
    title: 'Stay signed in',
    summary: 'Once you sign in on a device, you stay signed in, whichever page you open.',
    body: [
      'Before, opening some pages or reloading could make it look like you had been signed out. Your sign-in is now remembered on every page of the site.',
      'The sign-in link we email you now brings you back to the same place you asked for it from.',
    ],
    tags: ['improvement'],
  },
  {
    id: 'persistent-login-dev',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Session restored in the root layout',
    summary: 'The Supabase session is restored in __root.tsx instead of LandingPage, and magic links use emailRedirectTo.',
    body: [
      'useSupabaseSession() in src/routes/__root.tsx calls getSession() and subscribes to onAuthStateChange, so authStore.session is set on every route. LandingPage now reads the session from the store.',
      'signInWithOtp passes emailRedirectTo: window.location.origin. Each origin must be listed under Authentication → URL Configuration → Redirect URLs in Supabase, otherwise the link falls back to the Site URL.',
    ],
    tags: ['auth'],
  },
  {
    id: 'click-ids',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Every button now has a click ID',
    summary: 'Each clickable element has a unique ID, so a logged click journey points straight at the code.',
    body: [
      'All buttons, links, inputs and dropdowns now carry an ID like ManageCardsMainMenu/add-cards. The dev click log uses these IDs, and dropdown choices show which dropdown they belong to.',
      'Click logging can be switched on or off in one place: src/dev/clickLogConfig.ts. Clicks on elements without an ID are marked "(untagged)".',
    ],
    tags: ['tooling'],
  },
  {
    id: 'click-recorder',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Record a click path in development',
    summary: 'While running the dev server, every click is logged so a navigation path can be copied and shared.',
    body: [
      'In development, each click and typed value is logged to the browser console as a numbered step, with the button text, the components it belongs to and the current page.',
      'Run copy(clickPath()) in the console to copy the whole path, or clearClicks() to start a new one. Steps survive page reloads, and nothing is recorded in the production build.',
    ],
    tags: ['tooling'],
  },
  {
    id: 'dev-tailscale-startup',
    date: '2026-10-04',
    audience: 'dev',
    title: 'dev-tailscale.bat works from anywhere, including Startup',
    summary: 'The dev launcher now finds the project even when the .bat is copied to another folder.',
    body: [
      'Copying dev-tailscale.bat into the Windows Startup folder (or anywhere else) used to fail with "Could not read package.json", because it looked for the project next to itself.',
      'It now falls back to the project folder when it is not inside it, so it can start the dev server automatically when you log in.',
    ],
    tags: ['tooling', 'fix'],
  },
  {
    id: 'updates-page',
    date: '2026-10-04',
    audience: 'user',
    title: 'See what is new',
    summary: 'A new Updates page shows every improvement to the site.',
    body: [
      'Click Updates in the menu at the top to see what has changed recently, newest first.',
      'Each update comes with a picture of the part of the site that changed, so you can find it straight away.',
    ],
    screenshot: '/updates/updates-page.png',
    tags: ['new'],
  },
  {
    id: 'dev-tailscale',
    date: '2026-10-04',
    audience: 'dev',
    title: 'Open the dev server from your phone over Tailscale',
    summary: 'dev-tailscale.bat starts the dev server and gives you a fixed private URL for your phone.',
    body: [
      'Running dev-tailscale.bat finds a free port starting at 3000, starts Vite on it, and points https://<this-pc>.ts.net:4443 at it through Tailscale Serve.',
      'The phone URL stays the same no matter which local port is used, and only devices on your Tailscale network can open it.',
    ],
    tags: ['tooling'],
  },
];

// What this build shows: everything while developing, only user articles in production.
export const visibleUpdates = updates.filter((u) => import.meta.env.DEV || u.audience === 'user');
