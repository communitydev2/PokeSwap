# Project rules

## Log every update on the Updates page
Every change that affects the site or how it is run gets an article on the `/updates` page, in the same commit.

1. Add an entry at the **top** of the `updates` array in `src/updates/updates.ts` (newest first): `id` (kebab-case), `date` (YYYY-MM-DD), `title`, one-sentence `summary`, a few short `body` paragraphs written for someone using the site, and `tags`.
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
