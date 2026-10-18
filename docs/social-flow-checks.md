# Isolated social-flow checks

With Playwright Chromium installed, run:

```sh
node scripts/test-social-flows.mjs
```

Set `PLAYWRIGHT_BROWSERS_PATH` if Chromium is in a nondefault location. The suite
starts Vite on port 3006, loads a fixture page outside the production routes and
intercepts all Supabase REST/auth/function calls. It exercises real components
with synthetic accounts and cards. No sign-in emails or live writes are sent.
The suite refreshes `public/updates/social-flow-recovery.png`.

The checks cover friend request deduplication, refresh after remount and friendship
mutations, failure/retry handling, account switching, both Friends-only views,
picture-grid filtering and selection, the 50-card limit, mobile layout, exclusive
listing save parameters, personal market filters and the username timer boundary.

The database validation suite requires Docker and an installed `postgres:17` image:

```sh
node scripts/test-username-cooldown.mjs
```

It starts a disposable container without networking, ports or mounted volumes,
loads a minimal synthetic profile schema and the actual username trigger
migrations, and removes the container afterwards. It first reproduces the old
ability to clear a chosen username, then verifies nonempty-name validation,
nullable unfinished profiles, first setup, cooldown enforcement/boundary,
client timestamp tampering, admin moderation, banned words and duplicate names.

Migration `20261018001100_username_cooldown_validation.sql` must be applied through
the normal database-first release process. It does not alter existing profiles.
The UI and Friends fixes require only the site release.
