# Market pagination and recovery checks

Run the local browser suite with a Playwright Chromium installation available:

```sh
node scripts/test-market-recovery.mjs
```

If browsers are installed outside the default location, set
`PLAYWRIGHT_BROWSERS_PATH` to that installation directory first. The suite starts
Vite on port 3006, intercepts Supabase REST/auth/function requests and supplies
synthetic fixtures. It does not read or write a live database. It also refreshes
`public/updates/complete-search-and-market-recovery.png`.

The checks cover paged RPC response boundaries, unique ordering, aborts,
later-page failures, market/Manage cards results above 1,000 rows, market counts,
catalogue and metadata failures, retry recovery, a valid empty catalogue, lazy
Exclusive Trades mounting, tab/search/page/expanded-list persistence, stale
responses, mobile layout and the separate login page.

`fetchAllRpcRows` requests 1,000 rows per page, with a unique ordering column,
and returns only after every page succeeds. Market search/count reads and Manage
cards searches use it. Its optional abort signal stops superseded requests.

The public catalogue has explicit `idle`, `loading`, `ready` and `error` states.
`loadCardCatalogue` deduplicates concurrent requests and publishes the cards,
rarities and sets together. A ready catalogue, including an empty one, is reused
while navigating between pages. An error can be retried from the card market.

No database migration is required for these changes.
