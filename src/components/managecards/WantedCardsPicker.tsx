import { useEffect, useMemo, useState } from 'react';
import { ActionIcon, Alert, Badge, Button, Group, Paper, Select, SimpleGrid, Stack, Switch, Text, TextInput, UnstyledButton } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconCheck, IconX } from '@tabler/icons-react';
import { supabase } from '../../supabaseClient';
import { ANY_OPTION } from '../../constants';
import { usePokemonCardStore } from '../../store/pokemonCardsStore';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { expansionOptions } from '../../utils/searchOptions';
import type { PokemonCard } from '../../types/PokemonCard';
import { CardPicture } from '../CardPicture';

const PAGE_SIZE = 24;
export function WantedCardsPicker({ cards, value, onChange, tcgAccountId, language, rarityId }: {
  cards: PokemonCard[]; value: string[]; onChange: (value: string[]) => void;
  tcgAccountId: string; language: string; rarityId: string | null;
}) {
  const t = useLocalizationStore((s) => s.t);
  const expansions = usePokemonCardStore((s) => s.supabase_expansion);
  const rarities = usePokemonCardStore((s) => s.supabase_rarity);
  const [search, setSearch] = useState('');
  const [query] = useDebouncedValue(search, 250);
  const [set, setSet] = useState<string | null>(ANY_OPTION);
  const [onlyWishlist, setOnlyWishlist] = useState(false);
  const [page, setPage] = useState(1);
  const [wishlist, setWishlist] = useState<{ key: string; ids: Set<string> } | null>(null);
  const [failed, setFailed] = useState(false);
  const wishlistKey = tcgAccountId + ':' + language;
  const wishlistIds = wishlist?.key === wishlistKey ? wishlist.ids : new Set<string>();
  const loading = wishlist?.key !== wishlistKey && !failed;
  useEffect(() => {
    let cancelled = false;
    setWishlist(null);
    setFailed(false);
    async function load() {
      try {
        const ids = new Set<string>();
        for (let from = 0; ; from += 1000) {
          const { data, error } = await supabase.from('wishlist').select('id, card(card_id)')
            .eq('tcg_account_id', tcgAccountId).eq('language', language).order('id').range(from, from + 999);
          if (error) throw error;
          for (const row of data as unknown as { card: { card_id: string } | null }[]) {
            if (row.card) ids.add(row.card.card_id);
          }
          if (data.length < 1000) break;
        }
        if (!cancelled) setWishlist({ key: wishlistKey, ids });
      } catch { if (!cancelled) setFailed(true); }
    }
    void load();
    return () => { cancelled = true; };
  }, [tcgAccountId, language, wishlistKey]);
  const filtered = useMemo(() => cards.filter((card) =>
    card.card_name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) &&
    (!set || set === ANY_OPTION || expansions.find((s) => s.set_id === card.set_id)?.set_name === set) &&
    (!onlyWishlist || wishlistIds.has(card.card_id))
  ), [cards, query, set, expansions, onlyWishlist, wishlist, wishlistKey]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  useEffect(() => setPage(1), [query, set, onlyWishlist, cards, tcgAccountId, language]);
  const selected = new Set(value);
  const selectedCards = value.map((id) => cards.find((c) => c.card_id === id)).filter((c): c is PokemonCard => !!c);
  const remove = (id: string) => onChange(value.filter((v) => v !== id));
  const setName = (card: PokemonCard) => expansions.find((s) => s.set_id === card.set_id)?.set_name ?? card.set_name ?? '';
  return <Stack gap="sm" data-click-id="ExclusiveTrades/wants-select" data-wanted-picker>
    <div><Text size="sm" fw={500}>{t.exclusiveWants}</Text><Text size="xs" c="dimmed">{t.exclusiveWantsHelp}</Text></div>
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <TextInput data-click-id="WantedCardsPicker/search" label={t.searchByName} value={search} onChange={(e) => setSearch(e.currentTarget.value)} />
      <Select data-click-id="WantedCardsPicker/set" label={t.pickerSet} data={expansionOptions(expansions, [ANY_OPTION]).map((name) => ({ value: name, label: name === ANY_OPTION ? t.pickerAllSets : name }))} value={set} onChange={setSet} allowDeselect={false} />
    </SimpleGrid>
    <Text size="sm" c="dimmed">{t.rarityLabel}: {rarities.find((r) => r.rarity_id === rarityId)?.name ?? cards[0]?.rarity_name ?? t.pickerSameRarity}</Text>
    <Switch data-click-id="WantedCardsPicker/wishlist" label={t.pickerOnlyWishlist} checked={onlyWishlist} onChange={(e) => setOnlyWishlist(e.currentTarget.checked)} disabled={loading || failed} />
    {failed && <Alert color="red">{t.pickerWishlistFailed}</Alert>}
    <Paper withBorder p="xs" radius="md" style={{ position: 'sticky', top: 'calc(var(--app-shell-header-height, 60px) + 8px)', zIndex: 2, background: 'var(--mantine-color-body)' }}>
      <Group justify="space-between"><Text size="sm" aria-live="polite">{t.pickerSelected(value.length)}</Text><Button data-click-id="WantedCardsPicker/clear" size="xs" variant="subtle" disabled={!value.length} onClick={() => onChange([])}>{t.pickerClear}</Button></Group>
      {selectedCards.length > 0 && <Group gap="xs" wrap="nowrap" mt="xs" style={{ overflowX: 'auto', paddingBottom: 4 }}>
        {selectedCards.map((card) => <div key={card.card_id} style={{ position: 'relative', flexShrink: 0, padding: '5px 8px 0 0' }}>
          <CardPicture cardImage={card.card_image} alt={card.card_name} width={40} zoom={false} radius={3} />
          <ActionIcon data-click-id={'WantedCardsPicker/remove:' + card.card_id} aria-label={t.pickerRemove(card.card_name)} size="xs" radius="xl" variant="filled" style={{ position: 'absolute', right: 0, top: 0 }} onClick={() => remove(card.card_id)}><IconX size={12} /></ActionIcon>
        </div>)}
      </Group>}
    </Paper>
    {filtered.length === 0 && <Text size="sm" c="dimmed" ta="center" py="md">{t.pickerEmpty}</Text>}
    <SimpleGrid cols={{ base: 2, xs: 3, md: 5, lg: 6 }} spacing="xs">
      {filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map((card) => <UnstyledButton key={card.card_id}
        data-click-id={'WantedCardsPicker/card:' + card.card_id} aria-pressed={selected.has(card.card_id)} disabled={!selected.has(card.card_id) && value.length >= 50}
        onClick={() => selected.has(card.card_id) ? remove(card.card_id) : value.length < 50 && onChange([...value, card.card_id])}
        style={{ position: 'relative', alignSelf: 'start', border: '2px solid', borderColor: selected.has(card.card_id) ? 'var(--mantine-color-blue-6)' : 'var(--mantine-color-default-border)', borderRadius: 8, padding: 6, opacity: !selected.has(card.card_id) && value.length >= 50 ? 0.5 : 1 }}>
        <CardPicture cardImage={card.card_image} alt={card.card_name} width="100%" zoom={false} radius={4} />
        {selected.has(card.card_id) && <Badge circle color="blue" style={{ position: 'absolute', top: 10, right: 10 }}><IconCheck size={14} /></Badge>}
        <Text size="sm" fw={500} mt={4} lineClamp={2}>{card.card_name}</Text>
        <Text size="xs" c="dimmed">{setName(card)} · #{card.card_local_id.split('-').pop()}</Text>
        {wishlistIds.has(card.card_id) && <Badge size="xs" variant="light" color="blue" mt={4} styles={{ root: { maxWidth: '100%', height: 'auto', whiteSpace: 'normal' }, label: { whiteSpace: 'normal' } }}>{t.pickerOnWishlist}</Badge>}
      </UnstyledButton>)}
    </SimpleGrid>
    <Group justify="center" gap="xs">
      <Button data-click-id="WantedCardsPicker/previous" size="xs" variant="default" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>{t.previousPage}</Button>
      <Text size="sm" aria-live="polite">{currentPage} / {pageCount}</Text>
      <Button data-click-id="WantedCardsPicker/next" size="xs" variant="default" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>{t.nextPage}</Button>
    </Group>
  </Stack>;
}
