import { ANY_OPTION } from '../constants';
import type { SupabaseRarityType } from '../types/SupabaseRarityType';
import type { SupabaseExpansionType } from '../types/SupabaseExpansionType';

// Rarities in the order they appear in the game; any new rarity the card sync
// adds goes at the end, so it still shows up in the filter.
const RARITY_ORDER = [
  'One Diamond', 'Two Diamond', 'Three Diamond', 'Four Diamond',
  'One Star', 'Two Star', 'Three Star', 'One Shiny', 'Two Shiny', 'Crown',
];

// Filter options built from the database (rarity / set tables), so new sets
// and rarities appear automatically. Falls back to `fallback` until they load.
export function rarityOptions(rarities: SupabaseRarityType[], fallback: string[]) {
  if (!rarities.length) return fallback;
  const rank = (name: string) => (RARITY_ORDER.includes(name) ? RARITY_ORDER.indexOf(name) : RARITY_ORDER.length);
  const names = rarities.map((r) => r.name).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return [ANY_OPTION, ...names];
}

// Sets in release order: by release_date (filled in by the card sync), else by set code
export function expansionOptions(expansions: (SupabaseExpansionType & { release_date?: string | null })[], fallback: string[]) {
  if (!expansions.length) return fallback;
  const names = [...expansions]
    .sort((a, b) =>
      a.release_date && b.release_date && a.release_date !== b.release_date
        ? a.release_date.localeCompare(b.release_date)
        : a.set_code.localeCompare(b.set_code, 'en', { numeric: true }),
    )
    .map((s) => s.set_name);
  return [ANY_OPTION, ...names];
}
