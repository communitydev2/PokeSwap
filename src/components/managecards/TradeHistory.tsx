import { useState } from 'react';
import { Badge, Button, Group, Paper, SegmentedControl, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconArrowsExchange, IconLock } from '@tabler/icons-react';
import { useLocalizationStore } from '../../store/useLocalizationStore';
import { OfferCard, type TradeOffer } from './Trades';

export function TradeHistory({ offers }: { offers: TradeOffer[] }) {
  const t = useLocalizationStore((state) => state.t);
  const isPhone = useMediaQuery('(max-width: 30em)');
  const [filter, setFilter] = useState('completed');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);
  const finished = offers.filter((o) => ['completed', 'declined', 'cancelled'].includes(o.status));
  const completedCount = finished.filter((o) => o.status === 'completed').length;
  const query = search.trim().toLocaleLowerCase();
  const matching = finished
    .filter((o) => (filter === 'all' || o.status === 'completed') &&
      [o.my_card.card_name, o.their_card.card_name, o.partner_name].some((name) => name.toLocaleLowerCase().includes(query)))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  const months = new Map<string, { label: string; offers: TradeOffer[] }>();
  for (const offer of matching.slice(0, visibleCount)) {
    const date = new Date(offer.updated_at);
    const key = date.getFullYear() + '-' + date.getMonth();
    if (!months.has(key)) months.set(key, {
      label: date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      offers: [],
    });
    months.get(key)!.offers.push(offer);
  }

  return (
    <Stack gap="md">
      <SegmentedControl size="sm" fullWidth={isPhone} style={isPhone ? undefined : { alignSelf: 'flex-start' }}
        value={filter} onChange={(value) => { setFilter(value); setVisibleCount(20); }}
        data={[
          { value: 'completed', label: <span data-click-id="TradeHistory/filter:completed">{t.historyCompleted}</span> },
          { value: 'all', label: <span data-click-id="TradeHistory/filter:all">{t.historyAllFinished}</span> },
        ]}
      />
      <TextInput data-click-id="TradeHistory/search" placeholder={t.historySearch} aria-label={t.historySearch}
        value={search} onChange={(event) => { setSearch(event.currentTarget.value); setVisibleCount(20); }} />
      <Text size="sm" c="dimmed">{t.historySummary(completedCount)}</Text>
      {finished.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">{t.historyEmpty}</Text>
      ) : matching.length === 0 ? (
        <Text c="dimmed" ta="center" py="xl">{t.historyNoMatches}</Text>
      ) : [...months].map(([key, month]) => (
        <Stack key={key} gap="xs">
          <Title order={5}>{month.label}</Title>
          {month.offers.map((o) => (
            <Paper key={o.id} withBorder radius="md" p="sm" data-click-context={`history ${o.id} with ${o.partner_name}`}>
              <Group justify="space-between" mb="xs">
                <Group gap={6}>
                  <Text size="sm" fw={600}>{t.tradesWith(o.partner_name)}</Text>
                  {o.exclusive_trade_id != null && (
                    <Badge size="sm" variant="light" color="grape" leftSection={<IconLock size={10} />}>{t.exclusiveBadge}</Badge>
                  )}
                  <Badge variant="light" color={o.status === 'completed' ? 'teal' : 'gray'}>{t.tradesStatus[o.status]}</Badge>
                </Group>
                <Text c="dimmed" size="xs">
                  {new Date(o.updated_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="sm">
                <OfferCard label={o.status === 'completed' ? t.historyYouGave : t.historyWouldGive} card={o.my_card} language={o.my_language} />
                <IconArrowsExchange size={20} style={{ flexShrink: 0, opacity: 0.6 }} />
                <OfferCard label={o.status === 'completed' ? t.historyYouGot : t.historyWouldGet} card={o.their_card} language={o.their_language} />
              </SimpleGrid>
            </Paper>
          ))}
        </Stack>
      ))}
      {matching.length > visibleCount && (
        <Button variant="default" data-click-id="TradeHistory/show-more" onClick={() => setVisibleCount((count) => count + 20)}>
          {t.historyShowMore}
        </Button>
      )}
    </Stack>
  );
}
