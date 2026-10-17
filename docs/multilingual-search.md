# Pokémon name search

`search_cards_filter` searches English card names and translated species names
from PokéAPI. Both the card market and Manage cards use this RPC. Results keep
their English card names; trainer names and set names are not translated.

Apply migrations `20261018000600_multilingual_card_search.sql` and
`20261018000700_pokemon_search_names_data.sql` using the normal database release
process. No Edge Function redeployment or card sync is required. Names are stored
separately from the sync-owned card catalogue, so future cards of these species
automatically become searchable. This does not change collection language codes.

The data migration records its exact upstream revision. It includes all 1,025
species available at generation time, translated names and romanizations supplied
by PokéAPI. Missing upstream translations cannot be searched. Pokémon names in
Portuguese generally use their English spelling; no translations are invented.
The redistribution notice is in [licenses/pokeapi.txt](licenses/pokeapi.txt).

To refresh the data, generate a **new** migration (the script refuses to overwrite):

```sh
node scripts/generate-pokemon-search-names.mjs supabase/migrations/<new-timestamp>_pokemon_search_names_data.sql
```

Review the generated names and apply that migration through the normal release
process. Existing aliases are retained. To test the SQL without touching any live
database, with Docker running:

```sh
node scripts/test-multilingual-search.mjs
```

This starts and removes a disposable PostgreSQL 17 container with no network,
published ports or mounted volumes, using a small synthetic card catalogue.

Add `--browser` to also run Playwright against a temporary Vite server and save
the Updates screenshot. Supabase REST, auth and function requests are intercepted
and answered from the disposable database. A Playwright Chromium installation is
required (`PLAYWRIGHT_BROWSERS_PATH` can select an existing installation).
