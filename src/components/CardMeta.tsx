import { Text } from '@mantine/core';
import { usePokemonCardStore } from '../store/pokemonCardsStore';

// Rarity names (as in the rarity table) shown as the game's symbols
const RARITY_SYMBOLS: Record<string, string> = {
  'One Diamond': '◆',
  'Two Diamond': '◆◆',
  'Three Diamond': '◆◆◆',
  'Four Diamond': '◆◆◆◆',
  'One Star': '★',
  'Two Star': '★★',
  'Three Star': '★★★',
  'One Shiny': '✦',
  'Two Shiny': '✦✦',
  Crown: '♛',
};

type CardLike = {
  card_local_id?: string;
  set_id?: string;
  rarity_id?: string | null;
  // Search results already include these names
  set_name?: string;
  rarity_name?: string;
};

// "Genetic Apex · #096 · ◆◆◆◆": tells apart cards that share a name
// (most Pokémon have several versions with different artwork)
export function CardMeta({ card, size = 'sm' }: { card: CardLike; size?: 'xs' | 'sm' }) {
  const expansions = usePokemonCardStore((state) => state.supabase_expansion);
  const rarities = usePokemonCardStore((state) => state.supabase_rarity);

  const setName = card.set_name ?? expansions.find((s) => s.set_id === card.set_id)?.set_name;
  const rarityName = card.rarity_name ?? rarities.find((r) => r.rarity_id === card.rarity_id)?.name;
  const number = card.card_local_id?.split('-').pop();
  const symbols = rarityName ? RARITY_SYMBOLS[rarityName] ?? rarityName : undefined;

  const parts = [setName, number && `#${number}`].filter(Boolean);
  if (!parts.length && !symbols) return null;

  return (
    <Text size={size} c="dimmed" lineClamp={1}>
      {parts.join(' · ')}
      {symbols && (
        <>
          {parts.length > 0 && ' · '}
          <span title={rarityName} aria-label={rarityName} style={{ letterSpacing: 1 }}>
            {symbols}
          </span>
        </>
      )}
    </Text>
  );
}
