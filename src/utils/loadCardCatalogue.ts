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
  const status = usePokemonCardStore.getState().catalogueStatus;
  if (status !== 'idle' && status !== 'error') return Promise.resolve();
  usePokemonCardStore.setState({ catalogueStatus: 'loading' });
  pending = Promise.allSettled([
    fetchAllRows<PokemonCard>('card', 'card_local_id').then((pokemonCards) => {
      usePokemonCardStore.setState({ pokemonCards });
    }),
    fetchAllRows<SupabaseRarityType>('rarity', 'rarity_id').then((supabase_rarity) => {
      usePokemonCardStore.setState({ supabase_rarity });
    }),
    fetchAllRows<SupabaseExpansionType>('set', 'set_id').then((supabase_expansion) => {
      usePokemonCardStore.setState({ supabase_expansion });
    }),
  ]).then((results) => {
    usePokemonCardStore.setState({
      catalogueStatus: results.every((result) => result.status === 'fulfilled') ? 'ready' : 'error',
    });
  }).catch(() => {
    usePokemonCardStore.setState({ catalogueStatus: 'error' });
  }).finally(() => { pending = null; });
  return pending;
}
