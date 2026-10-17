import { useEffect, useRef, useState } from 'react';
import { Alert, Badge, Button, Group, Paper, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
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
  const pinnedRef = useRef<HTMLDivElement>(null);

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
    <Stack gap="sm" maw={760} mx="auto">
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
              <Text size="sm">{t.exclusiveForOneOf(l.want_cards.length, l.want_language.toUpperCase())}</Text>
              <SimpleGrid cols={{ base: 4, xs: 6, sm: 8 }} spacing={6}>
                {l.want_cards.map((c) => (
                  <div key={c.card_id} title={`${c.card_name} · ${c.card_local_id}`}>
                    <CardPicture cardImage={c.card_image} alt={c.card_name} width="100%" radius={3} />
                  </div>
                ))}
              </SimpleGrid>
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
                      size="xs"
                      onClick={() => setOffer(l)}
                    >
                      {t.marketExclusiveOffer}
                    </Button>
                  </Group>
                ))}
            </Stack>
          </Group>
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
