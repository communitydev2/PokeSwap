import { usePokemonCardStore } from '../store/pokemonCardsStore';
import type { PokemonCard } from '../types/PokemonCard';
import type { SupabaseExpansionType } from '../types/SupabaseExpansionType';
import type { SupabaseRarityType } from '../types/SupabaseRarityType';
import { fetchAllRows } from './fetchAllRows';

let pending: Promise<void> | null = null;

// The public catalogue is shared across pages. Deduplicate concurrent loads and
// retain a successful empty catalogue as a ready state, not an endless spinner.
export function loadCardCatalogue(): Promise<void> {
  if (pending) return pending;
  if (usePokemonCardStore.getState().catalogueStatus === 'ready') return Promise.resolve();
  usePokemonCardStore.setState({ catalogueStatus: 'loading' });
  pending = Promise.all([
    fetchAllRows<PokemonCard>('card', 'card_local_id'),
    fetchAllRows<SupabaseRarityType>('rarity', 'rarity_id'),
    fetchAllRows<SupabaseExpansionType>('set', 'set_id'),
  ]).then(([pokemonCards, supabase_rarity, supabase_expansion]) => {
    usePokemonCardStore.setState({ pokemonCards, supabase_rarity, supabase_expansion, catalogueStatus: 'ready' });
  }).catch(() => {
    usePokemonCardStore.setState({ catalogueStatus: 'error' });
  }).finally(() => { pending = null; });
  return pending;
}
