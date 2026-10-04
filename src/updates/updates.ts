// Every user-facing change gets an entry here (newest first).
// Screenshots live in public/updates/ - capture them with:
//   node scripts/screenshot.mjs <route> public/updates/<id>.png [css-selector]

export type Update = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  summary: string;
  body: string[];
  screenshot?: string; // path under public/, e.g. /updates/my-update.png
  tags?: string[];
};

export const updates: Update[] = [
  {
    id: 'click-recorder',
    date: '2026-10-04',
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
    title: 'New Updates page',
    summary: 'A changelog that shows every update to the site as a short article.',
    body: [
      'There is now an Updates section, linked from the header, where each change to the site is written up as a small article.',
      'Each article includes a screenshot of the part of the site that changed, so you can see what is new at a glance.',
    ],
    screenshot: '/updates/updates-page.png',
    tags: ['feature'],
  },
  {
    id: 'dev-tailscale',
    date: '2026-10-04',
    title: 'Open the dev server from your phone over Tailscale',
    summary: 'dev-tailscale.bat starts the dev server and gives you a fixed private URL for your phone.',
    body: [
      'Running dev-tailscale.bat finds a free port starting at 3000, starts Vite on it, and points https://<this-pc>.ts.net:4443 at it through Tailscale Serve.',
      'The phone URL stays the same no matter which local port is used, and only devices on your Tailscale network can open it.',
    ],
    tags: ['tooling'],
  },
];
