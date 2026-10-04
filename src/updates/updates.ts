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
