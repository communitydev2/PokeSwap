import { Badge, Group, Stack, Text, Tooltip, type BadgeProps } from '@mantine/core';
import { IconCrown } from '@tabler/icons-react';
import { useEffect, type ReactNode } from 'react';
import { usePokemonCardStore } from '../store/pokemonCardsStore';
import { useLocalizationStore } from '../store/useLocalizationStore';
import { loadCardCatalogue } from '../utils/loadCardCatalogue';

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
  card_id?: string;
  card_local_id?: string;
  reprint_of?: string | null;
  variant?: string | null;
  set_id?: string;
  rarity_id?: string | null;
  // Search results already include these names
  set_name?: string;
  rarity_name?: string;
};

// "Two Diamond · Genetic Apex · #096" plus a coloured rarity badge: tells apart cards that
// share a name (most Pokémon have several versions with different artwork)
export function CardMeta({ card, size = 'sm' }: { card: CardLike; size?: 'xs' | 'sm' }) {
  const expansions = usePokemonCardStore((state) => state.supabase_expansion);
  const rarities = usePokemonCardStore((state) => state.supabase_rarity);
  const allCards = usePokemonCardStore((state) => state.pokemonCards);
  const t = useLocalizationStore((state) => state.t);

  useEffect(() => {
    const status = usePokemonCardStore.getState().catalogueStatus;
    if (status === 'idle' || status === 'error') void loadCardCatalogue();
  }, []);

  // Search results can omit metadata, so fall back to the full card list.
  const full = card.card_id && (
    card.reprint_of === undefined || card.variant === undefined ||
    !card.rarity_id || !card.rarity_name || !card.set_id || !card.set_name
  ) ? allCards.find((c) => c.card_id === card.card_id) : undefined;
  const setName = card.set_name ?? expansions.find((s) => s.set_id === (card.set_id ?? full?.set_id))?.set_name;
  const rarityName = card.rarity_name ?? rarities.find((r) => r.rarity_id === (card.rarity_id ?? full?.rarity_id))?.name;
  const number = card.card_local_id?.split('-').pop();
  const rarity = rarityName ? RARITIES[rarityName] : undefined;

  const parts = [rarityName, setName, number && `#${number}`].filter(Boolean);
  if (!parts.length && !rarityName) return null;

  const reprintOf = card.reprint_of ?? full?.reprint_of;
  const isFoil = (card.variant ?? full?.variant) === 'parallel_foil';
  // "B2-120" -> "Fantastical Parade #120"
  const reprintLabel = reprintOf
    ? (() => {
        const code = reprintOf.split('-').slice(0, -1).join('-');
        const name = expansions.find((s) => s.set_code === code)?.set_name ?? code;
        return t.reprintOf(`${name} #${reprintOf.split('-').pop()}`);
      })()
    : undefined;

  return (
    <Stack gap={2} mt={2}>
    <Group gap={6} wrap="wrap">
      {rarityName && (
        <Tooltip label={rarityName} withArrow>
          <Badge
            size={size === 'xs' ? 'sm' : 'md'}
            radius="sm"
            {...(rarity?.badge ?? { variant: 'light', color: 'gray' })}
            aria-label={rarityName}
            style={{ flexShrink: 0, letterSpacing: 1, textTransform: 'none' }}
            styles={{ label: { display: 'inline-flex', alignItems: 'center', lineHeight: 1 } }}
          >
            {rarity?.symbols ?? rarityName}
          </Badge>
        </Tooltip>
      )}
      {parts.length > 0 && (
        <Text size={size} c="dimmed" lh={1.25} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
          {parts.join(' · ')}
        </Text>
      )}
    </Group>
    {(isFoil || reprintLabel) && (
      <Group gap={6} wrap="wrap">
        {isFoil && (
          <Badge size={size === 'xs' ? 'xs' : 'sm'} radius="sm" variant="gradient" gradient={{ from: 'cyan', to: 'indigo', deg: 90 }} style={{ flexShrink: 0 }}>
            {t.parallelFoil}
          </Badge>
        )}
        {reprintLabel && (
          <Text size="xs" c="dimmed" lh={1.25} style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
            {reprintLabel}
          </Text>
        )}
      </Group>
    )}
    </Stack>
  );
}

// Compact rarity badge for small card tiles, without the set and card number.
export function RaritySymbols({ card, size = 'sm' }: { card: CardLike; size?: 'xs' | 'sm' }) {
  const rarities = usePokemonCardStore((state) => state.supabase_rarity);
  const allCards = usePokemonCardStore((state) => state.pokemonCards);

  useEffect(() => {
    const status = usePokemonCardStore.getState().catalogueStatus;
    if (status === 'idle' || status === 'error') void loadCardCatalogue();
  }, []);

  const full = card.card_id && !card.rarity_id
    ? allCards.find((c) => c.card_id === card.card_id)
    : undefined;
  const rarityName = card.rarity_name ?? rarities.find((r) => r.rarity_id === (card.rarity_id ?? full?.rarity_id))?.name;
  const rarity = rarityName ? RARITIES[rarityName] : undefined;
  if (!rarity || !rarityName) return null;

  return (
    <Tooltip label={rarityName} withArrow>
      <Badge
        size={size === 'xs' ? 'sm' : 'md'}
        radius="sm"
        {...rarity.badge}
        aria-label={rarityName}
        style={{ flexShrink: 0, letterSpacing: 1, textTransform: 'none' }}
        styles={{ label: { display: 'inline-flex', alignItems: 'center', lineHeight: 1 } }}
      >
        {rarity.symbols}
      </Badge>
    </Tooltip>
  );
}
