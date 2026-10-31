import { useEffect } from 'react';
import { usePokemonCardStore } from '../store/pokemonCardsStore';
import type { SupabaseRarityType } from '../types/SupabaseRarityType';
import { loadCardCatalogue } from './loadCardCatalogue';

type CardLike = {
  card_id?: string;
  card_name: string;
  card_local_id?: string;
  rarity_id?: string | null;
  rarity_name?: string;
};

export function rarityNameOf(card: CardLike, rarities: readonly SupabaseRarityType[], allCards: readonly CardLike[]): string | undefined {
  const full = !card.rarity_id && card.card_id ? allCards.find((c) => c.card_id === card.card_id) : undefined;
  return card.rarity_name ?? rarities.find((r) => r.rarity_id === (card.rarity_id ?? full?.rarity_id))?.name;
}

export function useCardLabel(): (card: CardLike, language?: string) => string {
  const rarities = usePokemonCardStore((s) => s.supabase_rarity);
  const allCards = usePokemonCardStore((s) => s.pokemonCards);
  useEffect(() => {
    const status = usePokemonCardStore.getState().catalogueStatus;
    if (status === 'idle' || status === 'error') void loadCardCatalogue();
  }, []);
  return (card, language) => [card.card_name, rarityNameOf(card, rarities, allCards), card.card_local_id, language?.toUpperCase()].filter(Boolean).join(' · ');
}
