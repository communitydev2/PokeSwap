import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { ANY_OPTION } from '../../constants';
import { supabase } from '../../supabaseClient';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { expansionOptions, rarityOptions } from '../../utils/searchOptions';
import type { PokemonCard } from '../../types/PokemonCard';
import { CardPicture } from '../CardPicture';
import { CardMeta } from '../CardMeta';
import { CardPlayers } from './CardPlayers';

type Count = { has: number; wants: number };
export function CardMarket({ onOpenExclusive }: { onOpenExclusive: (exclusiveTradeId: number) => void }) {
  const t = useLocalizationStore((s) => s.t);
  const catalogue = usePokemonCardStore((s) => s.pokemonCards);
  const rarities = usePokemonCardStore((s) => s.supabase_rarity);
  const expansions = usePokemonCardStore((s) => s.supabase_expansion);
  const rarityFallback = usePokemonCardStore((s) => s.rarities);
  const expansionFallback = usePokemonCardStore((s) => s.expansions);
  const [name, setName] = useState('');
  const [rarity, setRarity] = useState(ANY_OPTION);
  const [set, setSet] = useState(ANY_OPTION);
  const [side, setSide] = useState('all');
  const [results, setResults] = useState<PokemonCard[]>([]);
  const [counts, setCounts] = useState(new Map<string, Count>());
  const [countsLoading, setCountsLoading] = useState(true);
  const [countsFailed, setCountsFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = !!name.trim() || rarity !== ANY_OPTION || set !== ANY_OPTION;
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error } = await supabase.rpc('market_card_counts');
        if (cancelled) return;
        if (error) throw error;
        setCounts(
          new Map(
            ((data as { card_id: string; has_count: number; wants_count: number }[]) ?? []).map((r) => [
              r.card_id,
              { has: r.has_count, wants: r.wants_count },
            ]),
          ),
        );
      } catch {
        if (!cancelled) setCountsFailed(true);
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    setPage(1);
    setExpanded(null);
    setFailed(false);
    if (!filtered) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('search_cards_filter', {
          p_search_string: name,
          p_rarity: rarity === ANY_OPTION ? 'any' : rarity,
          p_set: set === ANY_OPTION ? 'any' : set,
        });
        if (cancelled) return;
        if (error) throw error;
        setResults((data ?? []) as PokemonCard[]);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [name, rarity, set, filtered]);
  const cards = (filtered ? results : catalogue).filter(
    (c) => side === 'all' || (counts.get(c.card_id)?.[side === 'has' ? 'has' : 'wants'] ?? 0) > 0,
  );
  const pages = Math.max(1, Math.ceil(cards.length / 10));
  const currentPage = Math.min(page, pages);
  return (
    <Stack gap="sm">
      <TextInput
        data-click-id="CardMarket/name"
        label={t.searchByName}
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
      />
      <Group grow align="flex-start">
        <Select
          data-click-id="CardMarket/rarity"
          label={t.rarityLabel}
          data={rarityOptions(rarities, rarityFallback)}
          value={rarity}
          onChange={(v) => setRarity(v ?? ANY_OPTION)}
          allowDeselect={false}
          renderOption={({ option }) => (
            <span data-click-id={`CardMarket/rarity-option:${option.value}`}>{option.label}</span>
          )}
        />
        <Select
          data-click-id="CardMarket/set"
          label={t.setLabel}
          data={expansionOptions(expansions, expansionFallback)}
          value={set}
          onChange={(v) => setSet(v ?? ANY_OPTION)}
          allowDeselect={false}
          searchable
          renderOption={({ option }) => (
            <span data-click-id={`CardMarket/set-option:${option.value}`}>{option.label}</span>
          )}
        />
      </Group>
      <SegmentedControl
        data-click-id="CardMarket/filter"
        value={side}
        onChange={(v) => {
          setSide(v);
          setPage(1);
          setExpanded(null);
        }}
        data={[
          { value: 'all', label: <span data-click-id="CardMarket/filter:all">{t.marketCardsAll}</span> },
          { value: 'has', label: <span data-click-id="CardMarket/filter:has">{t.marketCardsHas}</span> },
          { value: 'wants', label: <span data-click-id="CardMarket/filter:wants">{t.marketCardsWants}</span> },
        ]}
      />
      {countsFailed && <Alert color="red">{t.marketCardsLoadFailed}</Alert>}
      {loading || countsLoading || (!filtered && catalogue.length === 0) ? (
        <Group>
          <Loader size="sm" />
          <Text>{t.marketCardsLoading}</Text>
        </Group>
      ) : failed ? (
        <Alert color="red">{t.marketCardsLoadFailed}</Alert>
      ) : (
        <>
          <Text size="sm" c="dimmed">
            {t.marketCardsTotal(cards.length)}
          </Text>
          {!cards.length && <Text c="dimmed">{t.marketCardsEmpty}</Text>}
          {cards.slice((currentPage - 1) * 10, currentPage * 10).map((card) => (
            <Paper key={card.card_id} withBorder p="sm" radius="md">
              <UnstyledButton
                w="100%"
                data-click-id={`CardMarket/card:${card.card_id}`}
                aria-expanded={expanded === card.card_id}
                onClick={() => setExpanded(expanded === card.card_id ? null : card.card_id)}
              >
                <Group wrap="nowrap">
                  <CardPicture cardImage={card.card_image} alt={card.card_name} width={56} />
                  <Stack gap={4}>
                    <Text fw={600}>{card.card_name}</Text>
                    <CardMeta card={card} />
                    <Group gap="xs">
                      {!!counts.get(card.card_id)?.has && (
                        <Badge size="sm">{t.marketCardsHaveCount(counts.get(card.card_id)!.has)}</Badge>
                      )}
                      {!!counts.get(card.card_id)?.wants && (
                        <Badge size="sm" color="grape">
                          {t.marketCardsWantCount(counts.get(card.card_id)!.wants)}
                        </Badge>
                      )}
                    </Group>
                  </Stack>
                </Group>
              </UnstyledButton>
              {expanded === card.card_id && <CardPlayers card={card} onOpenExclusive={onOpenExclusive} />}
            </Paper>
          ))}
          {pages > 1 && (
            <Group justify="space-between" mt="md">
              <Button
                data-click-id="CardMarket/previous-page"
                variant="default"
                leftSection={<IconChevronLeft size={16} />}
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
              >
                {t.previousPage}
              </Button>
              <Text size="sm" c="dimmed">
                {currentPage} / {pages}
              </Text>
              <Button
                data-click-id="CardMarket/next-page"
                variant="default"
                rightSection={<IconChevronRight size={16} />}
                disabled={currentPage >= pages}
                onClick={() => setPage(currentPage + 1)}
              >
                {t.nextPage}
              </Button>
            </Group>
          )}
        </>
      )}
    </Stack>
  );
}
