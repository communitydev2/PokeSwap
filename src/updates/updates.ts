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
