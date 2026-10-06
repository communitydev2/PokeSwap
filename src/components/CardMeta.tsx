import { Badge, Group, Text, Tooltip, type BadgeProps } from '@mantine/core';
import { IconCrown } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { usePokemonCardStore } from '../store/pokemonCardsStore';

type RarityStyle = { symbols: ReactNode; badge: Pick<BadgeProps, 'variant' | 'color' | 'gradient'> };

// Rarity names (as in the rarity table) -> the game's symbols and a badge style
// that gets louder the rarer the card is
const diamond = { variant: 'light', color: 'blue' } as const;
const star = { variant: 'filled', color: 'yellow.6' } as const;
const shiny = { variant: 'gradient', gradient: { from: 'grape', to: 'pink', deg: 90 } } as const;
const crown = { variant: 'gradient', gradient: { from: 'yellow.5', to: 'orange.7', deg: 90 } } as const;

const RARITIES: Record<string, RarityStyle> = {
  'One Diamond': { symbols: '◆', badge: diamond },
  'Two Diamond': { symbols: '◆◆', badge: diamond },
  'Three Diamond': { symbols: '◆◆◆', badge: diamond },
  'Four Diamond': { symbols: '◆◆◆◆', badge: diamond },
  'One Star': { symbols: '★', badge: star },
  'Two Star': { symbols: '★★', badge: star },
  'Three Star': { symbols: '★★★', badge: star },
  'One Shiny': { symbols: '✦', badge: shiny },
  'Two Shiny': { symbols: '✦✦', badge: shiny },
  // The ♛ character renders as a blob in many fonts, so the crown uses an icon
  Crown: { symbols: <IconCrown size={14} stroke={2} style={{ display: 'block' }} />, badge: crown },
};

type CardLike = {
  card_local_id?: string;
  set_id?: string;
  rarity_id?: string | null;
  // Search results already include these names
  set_name?: string;
  rarity_name?: string;
};

// "Genetic Apex · #096" plus a coloured rarity badge: tells apart cards that
// share a name (most Pokémon have several versions with different artwork)
export function CardMeta({ card, size = 'sm' }: { card: CardLike; size?: 'xs' | 'sm' }) {
  const expansions = usePokemonCardStore((state) => state.supabase_expansion);
  const rarities = usePokemonCardStore((state) => state.supabase_rarity);

  const setName = card.set_name ?? expansions.find((s) => s.set_id === card.set_id)?.set_name;
  const rarityName = card.rarity_name ?? rarities.find((r) => r.rarity_id === card.rarity_id)?.name;
  const number = card.card_local_id?.split('-').pop();
  const rarity = rarityName ? RARITIES[rarityName] : undefined;

  const parts = [setName, number && `#${number}`].filter(Boolean);
  if (!parts.length && !rarityName) return null;

  return (
    <Group gap={6} wrap="nowrap" mt={2}>
      {rarityName && (
        <Tooltip label={rarityName} withArrow>
          <Badge
            size={size === 'xs' ? 'sm' : 'md'}
            radius="sm"
            {...(rarity?.badge ?? { variant: 'light', color: 'gray' })}
            aria-label={rarityName}
            style={{ flexShrink: 0, letterSpacing: 1, textTransform: 'none' }}
          >
            {rarity?.symbols ?? rarityName}
          </Badge>
        </Tooltip>
      )}
      {parts.length > 0 && (
        <Text size={size} c="dimmed" lineClamp={1}>
          {parts.join(' · ')}
        </Text>
      )}
    </Group>
  );
}
