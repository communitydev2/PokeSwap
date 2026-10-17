import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Group, Paper, Stack, Text, TextInput } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { supabase } from '../../supabaseClient';
import { useAuthStore } from '../../store/userStore';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { useMyTcgAccounts } from '../../hooks/useMyTcgAccounts';
import type { PokemonCard } from '../../types/PokemonCard';
import { CardPicture } from '../CardPicture';
import { CardMeta } from '../CardMeta';
import { ExclusiveOfferModal } from './ExclusiveOfferModal';

export type MarketExclusiveListing = {
  exclusive_trade_id: number;
  owner_account: string;
  owner_name: string | null;
  card: PokemonCard;
  language: string;
  want_language: string;
  want_cards: PokemonCard[];
  created_at: string;
  is_mine: boolean;
  total_count: number;
};

export function ExclusiveTradeMarket({ focusId }: { focusId?: number | null }) {
  const t = useLocalizationStore((s) => s.t);
  const session = useAuthStore((s) => s.session);
  const { accounts, loading: accountsLoading } = useMyTcgAccounts();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState({ search: '', page: 0 });
  const [rows, setRows] = useState<MarketExclusiveListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [focus, setFocus] = useState<number | null>(focusId ?? null);
  const [pinned, setPinned] = useState<MarketExclusiveListing | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [offer, setOffer] = useState<MarketExclusiveListing | null>(null);
  const [availableCards, setAvailableCards] = useState<Set<string>>(new Set());
  const [expandedListings, setExpandedListings] = useState<Set<number>>(new Set());
  const viewerId = session?.user.id;
  const pinnedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setAvailableCards(new Set());
    if (!viewerId || !accounts.length) return;

    async function loadTradeList() {
      try {
        const { data: cards, error: cardsError } = await supabase
          .from('cards_available_for_trade')
          .select('id, card_id, language')
          .in('tcg_account_id', accounts.map((account) => account.tcg_account_id));
        if (cancelled) return;
        if (cardsError) throw cardsError;
        if (!cards?.length) return;

        const { data: heldCards, error: heldError } = await supabase
          .from('exclusive_trade')
          .select('trade_card_id')
          .in('trade_card_id', cards.map((card) => card.id));
        if (cancelled) return;
        if (heldError) throw heldError;
        const heldIds = new Set((heldCards ?? []).map((card) => card.trade_card_id));
        setAvailableCards(new Set(
          cards.filter((card) => !heldIds.has(card.id)).map((card) => `${card.card_id}|${card.language}`),
        ));
      } catch (error) {
        if (!cancelled) console.warn('Could not load exclusive market trade list', error);
      }
    }
    void loadTradeList();
    return () => {
      cancelled = true;
    };
  }, [viewerId, accounts]);

  useEffect(() => {
    setFocus(focusId ?? null);
    setSearch('');
    setQuery({ search: '', page: 0 });
  }, [focusId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery({ search: search.trim(), page: 0 }), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setRows([]);
    setPinned(null);
    setTotal(0);
    async function load() {
      try {
        if (focus != null) {
          for (let offset = 0; offset < 500; offset += 100) {
            const result = await supabase.rpc('market_exclusive_trades', {
              p_search: '',
              p_limit: 100,
              p_offset: offset,
            });
            if (cancelled) return;
            if (result.error) throw result.error;
            const listings = (result.data ?? []) as MarketExclusiveListing[];
            const found = listings.find((l) => l.exclusive_trade_id === focus);
            if (found) {
              setPinned(found);
              break;
            }
            if (listings.length < 100 || offset + 100 >= Number(listings[0]?.total_count ?? 0)) break;
          }
        } else {
          const result = await supabase.rpc('market_exclusive_trades', {
            p_search: query.search,
            p_limit: 20,
            p_offset: query.page * 20,
          });
          if (cancelled) return;
          if (result.error) throw result.error;
          const listings = (result.data ?? []) as MarketExclusiveListing[];
          setRows(listings);
          setTotal(Number(listings[0]?.total_count ?? 0));
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [query, focus, session, retry]);

  useEffect(() => {
    if (!pinned) return;
    pinnedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlight(true);
    const timer = window.setTimeout(() => setHighlight(false), 4000);
    return () => window.clearTimeout(timer);
  }, [pinned]);

  function showAll() {
    setFocus(null);
    setPinned(null);
    setSearch('');
    setQuery({ search: '', page: 0 });
  }
  const pageCount = Math.max(1, Math.ceil(total / 20));

  return (
    <Stack gap="sm" w="100%">
      {focus == null ? (
        <>
          <TextInput
            data-click-id="ExclusiveTradeMarket/search"
            label={t.marketExclusiveSearch}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          {!loading && !error && (
            <Text size="sm" c="dimmed">
              {t.marketExclusiveCount(total)}
            </Text>
          )}
        </>
      ) : (
        <Alert>
          <Group justify="space-between">
            <Text size="sm">{t.marketExclusiveFocus}</Text>
            <Button data-click-id="ExclusiveTradeMarket/show-all" size="xs" variant="light" onClick={showAll}>
              {t.marketExclusiveShowAll}
            </Button>
          </Group>
        </Alert>
      )}
      {loading && (
        <Text size="sm" c="dimmed" role="status">
          {t.marketExclusiveLoading}
        </Text>
      )}
      {error && (
        <Alert color="red">
          <Stack gap="xs">
            <Text size="sm">{t.marketExclusiveLoadFailed}</Text>
            <Button
              data-click-id="ExclusiveTradeMarket/retry"
              size="xs"
              onClick={() => setRetry((n) => n + 1)}
            >
              {t.marketExclusiveRetry}
            </Button>
          </Stack>
        </Alert>
      )}
      {!loading && !error && !pinned && rows.length === 0 && (
        <Text size="sm" c="dimmed">
          {focus != null ? t.marketExclusiveFocusMissing : t.marketExclusiveEmpty}
        </Text>
      )}
      {(pinned ? [pinned] : rows).map((l) => (
        <Paper
          key={l.exclusive_trade_id}
          ref={pinned ? pinnedRef : undefined}
          withBorder
          radius="md"
          p="md"
          style={
            pinned && highlight
              ? {
                  borderColor: 'var(--mantine-color-blue-filled)',
                  background: 'var(--mantine-color-blue-light)',
                }
              : undefined
          }
          data-click-context={`exclusive trade: ${l.card.card_name}`}
        >
          <Group justify="space-between" mb="xs">
            <Text fw={600} c={l.owner_name == null ? 'dimmed' : undefined}>
              {l.owner_name ?? t.marketSignInToSeePlayers}
            </Text>
            {l.is_mine && (
              <Badge variant="light" color="teal">
                {t.marketYours}
              </Badge>
            )}
          </Group>
          <Stack gap="sm">
          <Group wrap="nowrap" align="flex-start" gap="md">
            <CardPicture cardImage={l.card.card_image} alt={l.card.card_name} width={56} radius={4} />
            <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
              <div>
                <Text fw={600}>{l.card.card_name}</Text>
                <Group gap={6}>
                  <CardMeta card={l.card} size="xs" />
                  <Badge variant="light" color="gray" radius="sm" size="sm">
                    {l.language.toUpperCase()}
                  </Badge>
                </Group>
              </div>
            </Stack>
          </Group>
              <Text size="sm">{t.exclusiveForOneOf(l.want_cards.length, l.want_language.toUpperCase())}</Text>
              <Stack gap={6}>
                {[...l.want_cards]
                  .sort((a, b) => Number(availableCards.has(`${b.card_id}|${l.want_language}`))
                    - Number(availableCards.has(`${a.card_id}|${l.want_language}`)))
                  .slice(0, expandedListings.has(l.exclusive_trade_id) ? undefined : 5)
                  .map((c) => (
                    <Group key={c.card_id} wrap="nowrap" gap="xs">
                      <div style={{ flexShrink: 0 }}>
                        <CardPicture cardImage={c.card_image} alt={c.card_name} width={44} radius={3} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={600} style={{ overflowWrap: 'anywhere' }}>{c.card_name}</Text>
                        <CardMeta card={c} size="xs" />
                        {!l.is_mine && availableCards.has(`${c.card_id}|${l.want_language}`) && (
                          <Badge size="xs" color="green" variant="light">
                            {t.marketExclusiveOnYourList}
                          </Badge>
                        )}
                      </div>
                    </Group>
                  ))}
              </Stack>
              {l.want_cards.length > 5 && (
                <Button
                  data-click-id={`ExclusiveTradeMarket/toggle-wanted:${l.exclusive_trade_id}`}
                  variant="subtle"
                  size="xs"
                  aria-expanded={expandedListings.has(l.exclusive_trade_id)}
                  onClick={() => setExpandedListings((current) => {
                    const next = new Set(current);
                    if (next.has(l.exclusive_trade_id)) next.delete(l.exclusive_trade_id);
                    else next.add(l.exclusive_trade_id);
                    return next;
                  })}
                >
                  {expandedListings.has(l.exclusive_trade_id)
                    ? t.marketExclusiveShowFewerWanted
                    : t.marketExclusiveShowAllWanted(l.want_cards.length)}
                </Button>
              )}
              {!l.is_mine &&
                (!session ? (
                  <Text size="xs" c="dimmed">
                    {t.marketSignInToOffer}
                  </Text>
                ) : accountsLoading ? (
                  <Text size="xs" c="dimmed">
                    {t.marketExclusiveEligibilityLoading}
                  </Text>
                ) : !accounts.length ? (
                  <Text size="xs" c="dimmed">
                    {t.marketNoAccount}
                  </Text>
                ) : (
                  <Group justify="flex-end">
                    <Button
                      data-click-id={`ExclusiveTradeMarket/offer:${l.exclusive_trade_id}`}
                      size="sm"
                      w={{ base: '100%', xs: 'auto' }}
                      onClick={() => setOffer(l)}
                    >
                      {t.marketExclusiveOffer}
                    </Button>
                  </Group>
                ))}
          </Stack>
        </Paper>
      ))}
      {focus == null && pageCount > 1 && (
        <Group justify="space-between" mt="md">
          <Button
            data-click-id="ExclusiveTradeMarket/previous-page"
            variant="default"
            leftSection={<IconChevronLeft size={16} />}
            disabled={loading || query.page <= 0}
            onClick={() => setQuery((q) => ({ ...q, page: q.page - 1 }))}
          >
            {t.previousPage}
          </Button>
          <Text size="sm" c="dimmed">
            {query.page + 1} / {pageCount}
          </Text>
          <Button
            data-click-id="ExclusiveTradeMarket/next-page"
            variant="default"
            rightSection={<IconChevronRight size={16} />}
            disabled={loading || query.page + 1 >= pageCount}
            onClick={() => setQuery((q) => ({ ...q, page: q.page + 1 }))}
          >
            {t.nextPage}
          </Button>
        </Group>
      )}
      {offer && (
        <ExclusiveOfferModal
          key={offer.exclusive_trade_id}
          opened
          onClose={() => setOffer(null)}
          listing={offer}
        />
      )}
    </Stack>
  );
}
